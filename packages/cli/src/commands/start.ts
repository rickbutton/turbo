import {
    Turbo,
    Layout,
    SessionId,
    generateSessionId,
    createShell,
} from "@turbo/core";
import { Client } from "@turbo/net";
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
    const id = generateSessionId(turbo);

    const layout = turbo.config.layout || defaultLayout;
    // spawn daemon in background
    spawnDaemon(turbo, id);

    const client = new Client(turbo, {
        type: "managed",
        sessionId: id,
        maxRetries: 20,
    });
    client.connect();

    client.on("ready", () => {
        const shell = createShell(turbo);
        shell.start(id, layout, turbo);
    });
}
