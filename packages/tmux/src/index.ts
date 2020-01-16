import {
    SessionId,
    Environment,
    Turbo,
    Pane,
    Window,
    Layout,
} from "@turbo/core";

export const DEFAULT_SESSION_ID = "turbo" as SessionId;
export function generateSessionId(turbo: Turbo): SessionId {
    const sessionIds = turbo.env.getAllSessionIds();

    const standardIds = sessionIds.filter(id => /^turbo(-.+)?$/.test(id));

    if (!standardIds.includes(DEFAULT_SESSION_ID)) {
        return DEFAULT_SESSION_ID;
    } else {
        const id = standardIds.length + 1;
        return `${DEFAULT_SESSION_ID}-${id}` as SessionId;
    }
}

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
    const tmux = inTmux(turbo);

    const footer = tmux ? [] : [";", "select-window", "-t:0", ";", "attach"];

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

function inTmux(turbo: Turbo): boolean {
    return Boolean(turbo.env.getVar("TMUX"));
}

export function getCurrentSessionId(turbo: Turbo): SessionId | undefined {
    if (turbo.options.sessionId) {
        return turbo.options.sessionId;
    }

    const ids = turbo.env.getAllSessionIds();
    if (inTmux(turbo)) {
        const tmuxId = turbo.env
            .execSync("tmux display-message -p '#S'")
            .toString()
            .split("\n")[0] as SessionId;

        if (ids.includes(tmuxId)) {
            return tmuxId;
        }
    }

    if (ids.length === 1) {
        return ids[0];
    }

    return undefined;
}
