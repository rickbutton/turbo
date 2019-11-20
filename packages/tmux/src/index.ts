import { SessionId, Environment, Jug, Pane, Layout } from "@jug/core";
import { ttyname } from "./ttyname";

export function generateSessionId(): SessionId {
    return `jug-${[...Array(4)]
        .map(() => (~~(Math.random() * 36)).toString(36))
        .join("")}` as SessionId;
}

function getNodeCommand(env: Environment, args: string[]): string {
    return `${env.nodePath} ${env.scriptPath} ${args.join(" ")}`;
}

function generateDaemonCommand(env: Environment): string[] {
    return [`${env.nodePath} ${env.scriptPath} daemon`];
}

function generatePaneCommand(pane: Pane, env: Environment): string[] {
    if (pane.type === "component") {
        return [getNodeCommand(env, ["component", pane.component])];
    } else if (pane.type === "exec") {
        return [pane.command];
    } else if (pane.type === "shell") {
        return [env.getVar("SHELL") || "sh"];
    } else {
        return [];
    }
}

function generatePaneCommands(panes: Pane[], env: Environment): string[][] {
    const commands: string[][] = [];
    for (const pane of panes) {
        const command = generatePaneCommand(pane, env);
        const paneCommand = [";", "split-window", ...command];
        commands.push(paneCommand);
    }
    return commands;
}

function generateTargetCommands(jug: Jug): string[] {
    return [
        ";",
        "new-window",
        "-n",
        "target",
        getNodeCommand(jug.env, ["target"]),
    ];
}

function generateSessionArgs(
    id: SessionId,
    layout: Layout,
    jug: Jug,
): string[] {
    const firstWindow = layout.windows[0];
    const firstPane = firstWindow.panes[0];
    const firstCommand = generatePaneCommand(firstPane, jug.env);

    let commands: string[][] = [
        [
            "new-session",
            "-d",
            "-n",
            firstWindow.name,
            "-s",
            id,
            ...firstCommand,
        ],
    ];
    const paneCommands = generatePaneCommands(
        firstWindow.panes.slice(1),
        jug.env,
    );
    commands = commands.concat(paneCommands);

    for (const window of layout.windows.slice(1)) {
        const firstPane = window.panes[0];
        const firstCommand = generatePaneCommand(firstPane, jug.env);
        const windowCommand = [
            ";",
            "new-window",
            "-n",
            window.name,
            ...firstCommand,
        ];
        commands.push(windowCommand);

        const paneCommands = generatePaneCommands(
            window.panes.slice(1),
            jug.env,
        );
        commands = commands.concat(paneCommands);
    }
    commands.push([
        ";",
        "new-window",
        "-n",
        "daemon",
        ...generateDaemonCommand(jug.env),
        ...generateTargetCommands(jug),
        ";",
        "select-window",
        "-t:0",
        ";",
        "attach",
    ]);

    return commands.flat();
}

interface TmuxStartCommand {
    command: string;
    args: string[];
}
export function generateTmuxStartCommand(
    id: SessionId,
    layout: Layout,
    jug: Jug,
): TmuxStartCommand {
    return {
        command: "tmux",
        args: generateSessionArgs(id, layout, jug),
    };
}

export function getCurrentSessionId(env: Environment): SessionId | undefined {
    const tty = ttyname();

    if (!tty) {
        throw new Error("could not detect TTY");
    }

    const sessionsOutput = env.execSync(
        "tmux list-sessions -F '#{session_name}' 2>/dev/null",
    );
    const sessionStrings = sessionsOutput.split("\n");
    for (const sessionString of sessionStrings) {
        const panesOutput = env.execSync(
            `tmux list-panes -F '#{pane_tty} #{session_name}' -t '${sessionString}'`,
        );
        const paneStrings = panesOutput.split("\n");

        for (const paneString of paneStrings) {
            if (paneString.includes(tty)) {
                const parts = paneString.split(" ");
                if (parts.length !== 2) {
                    throw new Error("invalid tmux output");
                }

                return parts[1] as SessionId;
            }
        }
    }

    return undefined;
}
