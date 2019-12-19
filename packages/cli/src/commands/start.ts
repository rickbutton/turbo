import { generateTmuxStartCommand, generateSessionId } from "@turbo/tmux";
import { Turbo, Layout, SessionId } from "@turbo/core";
import * as ffi from "ffi";
import * as ref from "ref";
import ArrayType from "ref-array";
import child from "child_process";

const defaultLayout: Layout = {
    windows: [
        {
            name: "debug",
            panes: [
                { type: "component", component: "test1" },
                { type: "component", component: "test2" },
                { type: "shell" },
            ],
        },
        { name: "sh", panes: [{ type: "shell" }] },
    ],
};

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

function spawnDaemon(turbo: Turbo, id: SessionId): void {
    try {
        const exec = turbo.env.nodePath;
        const args = [turbo.env.scriptPath, "--session", id, "daemon"];
        child.spawn(exec, args, { detached: true, stdio: "ignore" });
    } catch (e) {
        console.error("failed to spawn daemon");
        console.error(e);
        process.exit(1);
    }
}

export function start(turbo: Turbo): void {
    const id = generateSessionId();

    const layout = turbo.config.layout || defaultLayout;

    const { command, args } = generateTmuxStartCommand(id, layout, turbo);

    // spawn daemon in background
    spawnDaemon(turbo, id);

    // replace current process with spawned tmux
    execvp(command, args);
}
