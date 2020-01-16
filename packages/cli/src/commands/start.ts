import { generateTmuxStartCommand, generateSessionId } from "@turbo/tmux";
import { LOGO, Turbo, Layout, SessionId } from "@turbo/core";
import { Client } from "@turbo/net";
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
        const spawned = child.spawn(exec, args, {
            detached: true,
            stdio: "ignore",
        });

        spawned.on("exit", code => {
            console.error(`daemon died! ${code}`);
        });
        spawned.on("error", err => {
            console.error(err);
        });
        if (spawned.stdout) {
            spawned.stdout.on("data", data => {
                process.stdout.write(data);
            });
        }
        if (spawned.stderr) {
            spawned.stderr.on("data", data => {
                process.stderr.write(data);
            });
        }
    } catch (e) {
        console.error("failed to spawn daemon");
        console.error(e);
        process.exit(1);
    }
}

export function start(turbo: Turbo): void {
    console.log(LOGO);

    const id = generateSessionId(turbo);

    const layout = turbo.config.layout || defaultLayout;

    const { command, args } = generateTmuxStartCommand(id, layout, turbo);

    // spawn daemon in background
    spawnDaemon(turbo, id);

    const client = new Client(turbo, {
        type: "managed",
        sessionId: id,
    });
    client.connect();

    client.on("ready", () => {
        // replace current process with spawned tmux
        execvp(command, args);
    });
}
