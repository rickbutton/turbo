import {
    SessionId,
    Environment,
    Turbo,
    Pane,
    Layout,
    createLogger,
} from "@turbo/core";

const logger = createLogger("tmux");

export function generateSessionId(): SessionId {
    return `turbo-${[...Array(4)]
        .map(() => (~~(Math.random() * 36)).toString(36))
        .join("")}` as SessionId;
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

function generateDaemonCommand(env: Environment): string[] {
    return [`${env.nodePath} ${env.scriptPath} daemon`];
}

function generatePaneCommand(pane: Pane, env: Environment): string[] {
    if (pane.type === "component") {
        return [`${getNodeCommand(env, ["component", pane.component])}`];
    } else if (pane.type === "exec") {
        return [pane.command];
    } else if (pane.type === "shell") {
        const shell = env.getVar("SHELL") || "sh";
        return [shell];
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

function generateTargetCommands(turbo: Turbo): string[] {
    return [
        ";",
        "new-window",
        "-n",
        "target",
        getNodeCommand(turbo.env, ["target"]),
    ];
}

function generateSessionArgs(
    id: SessionId,
    layout: Layout,
    turbo: Turbo,
): string[] {
    const firstWindow = layout.windows[0];
    const firstPane = firstWindow.panes[0];
    const firstCommand = generatePaneCommand(firstPane, turbo.env);

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
        turbo.env,
    );
    commands = commands.concat(paneCommands);

    for (const window of layout.windows.slice(1)) {
        const firstPane = window.panes[0];
        const firstCommand = generatePaneCommand(firstPane, turbo.env);
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
            turbo.env,
        );
        commands = commands.concat(paneCommands);
    }
    commands.push([
        ";",
        "new-window",
        "-n",
        "daemon",
        ...generateDaemonCommand(turbo.env),
        ...generateTargetCommands(turbo),
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
    turbo: Turbo,
): TmuxStartCommand {
    return {
        command: "tmux",
        args: generateSessionArgs(id, layout, turbo),
    };
}

export function getCurrentSessionId(env: Environment): SessionId | undefined {
    const inTmux = Boolean(env.getVar("TMUX"));

    if (inTmux) {
        return env
            .execSync("tmux display-message -p '#S'")
            .toString()
            .split("\n")[0] as SessionId;
    } else {
        return undefined;
    }
}
