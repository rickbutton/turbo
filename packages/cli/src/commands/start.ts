import {
    Turbo,
    SessionId,
    generateSessionId,
    getCurrentSessionId,
} from "@turbo/core";
import { Client } from "@turbo/net";
import child from "child_process";
import { Layout } from "../components/layout";
import { renderComponent } from "../commands/component";

function spawnDaemon(turbo: Turbo, id: SessionId): void {
    try {
        const exec = turbo.env.nodePath;
        const args = [turbo.env.scriptPath, "--session", id, "daemon"];

        if (turbo.options.keepAlive) {
            args.push("--keep-alive");
        }

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
    } catch (e) {
        console.error("failed to spawn daemon");
        console.error(e);
        turbo.env.exit();
    }
}
// make daemon not crash on missing target script
// daemon server sends "error message?"
// embeds "lastErrors" in pong message?
// make client auto-ping on connection?
//
// can use a mapping of error code -> error # in TS
// if needed to communicate specific errors to spawner from daemon
//
// write a wrapper around error handling for client users

export function start(turbo: Turbo): void {
    const id = getCurrentSessionId(turbo);

    function render(): void {
        renderComponent(turbo, { type: "react", value: Layout });
    }

    if (id) {
        render();
    } else {
        const id = generateSessionId(turbo);

        // spawn daemon in background
        spawnDaemon(turbo, id);

        const client = new Client(turbo, {
            type: "managed",
            sessionId: id,
            maxRetries: 20,
        });
        client.connect();

        client.on("ready", () => {
            render();
        });
    }
}
