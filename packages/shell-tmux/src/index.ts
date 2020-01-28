import {
    SessionId,
    Environment,
    Turbo,
    Pane,
    Window,
    Layout,
    Shell,
} from "@turbo/core";
import ArrayType from "ref-array";
import * as ffi from "ffi";
import * as ref from "ref";

function getNodeCommand(
    env: Environment,
    args: string[],
    inspect = false,
): string {
    return `${env.nodePath}${inspect ? "--inspect-brk " : " "}${
        env.scriptPath
    } ${args.join(" ")}`;
}

function generatePaneCommand(
    id: SessionId,
    pane: Pane,
    env: Environment,
): string[] {
    if (pane.type === "component") {
        return [
            `${getNodeCommand(env, [
                "--session",
                id,
                "component",
                pane.component,
            ])}`,
        ];
    } else if (pane.type === "exec") {
        return [pane.command];
    } else if (pane.type === "shell") {
        const shell = env.getVar("SHELL") || "sh";
        return [shell];
    } else {
        return [];
    }
}

function generatePaneCommands(
    id: SessionId,
    panes: Pane[],
    env: Environment,
): string[][] {
    const commands: string[][] = [];
    for (const pane of panes) {
        const command = generatePaneCommand(id, pane, env);
        const paneCommand = [";", "split-window", ...command];
        commands.push(paneCommand);
    }
    return commands;
}

function generateWindowCommands(
    id: SessionId,
    window: Window,
    env: Environment,
    first: boolean,
    tmux: boolean,
): string[] {
    let commands: string[] = [];

    const firstPane = window.panes[0];
    const firstCommand = generatePaneCommand(id, firstPane, env);
    const paneCommands = generatePaneCommands(id, window.panes.slice(1), env);
    if (first && !tmux) {
        commands = [
            "new-session",
            "-d",
            "-n",
            makeWindowName(id, window.name),
            "-s",
            id,
            ...firstCommand,
        ].concat(paneCommands.flat());
    } else {
        commands = [
            ...(first ? [] : [";"]),
            "new-window",
            "-a",
            "-n",
            makeWindowName(id, window.name),
            ...firstCommand,
        ].concat(paneCommands.flat());
    }

    return commands;
}

function makeWindowName(id: SessionId, name: string): string {
    return `${id}:${name}`;
}

function generateSessionArgs(
    id: SessionId,
    layout: Layout,
    turbo: Turbo,
): string[] {
    const tmux = inTmux(turbo.env);

    const footer = tmux
        ? Array(layout.windows.length - 1)
              .fill([";", "previous-window"])
              .flat()
        : [";", "select-window", "-t:0", ";", "attach"];

    return layout.windows
        .map((w, i) => generateWindowCommands(id, w, turbo.env, i === 0, tmux))
        .flat()
        .concat(footer);
}

interface TmuxStartCommand {
    command: string;
    args: string[];
}
export function generateTmuxStartCommand(
    id: SessionId,
    layout: Layout,
    turbo: Turbo,
): TmuxStartCommand {
    return {
        command: "tmux",
        args: generateSessionArgs(id, layout, turbo),
    };
}

function inTmux(env: Environment): boolean {
    return Boolean(env.getVar("TMUX"));
}

const stringArray = ArrayType("string");
function getFd(v: any): void {
    return v._handle.fd;
}

function execvp(command: string, args: string[]): void {
    if (args.length === 0) {
        throw new Error("invalid args to execvp");
    }

    const current = ffi.Library((null as unknown) as string, {
        execvp: ["int", ["string", stringArray]],
        dup2: ["int", ["int", "int"]],
    });
    current.dup2(getFd(process.stdin), 0);
    current.dup2(getFd(process.stdout), 1);
    current.dup2(getFd(process.stderr), 2);

    return current.execvp(command, [
        command,
        ...args.slice(),
        (ref.NULL as unknown) as string[],
    ]);
}

export default function tmux(options: {}, turbo: Turbo): Shell {
    return {
        start(id: SessionId, layout: Layout, turbo: Turbo): void {
            const { command, args } = generateTmuxStartCommand(
                id,
                layout,
                turbo,
            );
            execvp(command, args);
        },
        getSessionId(): SessionId | undefined {
            const ids = turbo.env.getAllSessionIds();
            if (inTmux(turbo.env)) {
                const tmuxId = turbo.env
                    .execSync("tmux display-message -p '#S'")
                    .toString()
                    .split("\n")[0] as SessionId;

                if (ids.includes(tmuxId)) {
                    return tmuxId;
                }
            }
            return undefined;
        },
    };
}
