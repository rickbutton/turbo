import { Turbo, uuid, StartedEvent, createLogger, Target } from "@turbo/core";
import { getCurrentSessionId } from "@turbo/tmux";
import { Client } from "@turbo/net";
import * as process from "process";

function waitForEnter(callback: () => void): void {
    function wait(): void {
        process.stdin.setRawMode(true);
        process.stdin.once("data", keystroke => {
            process.stdin.setRawMode(false);
            if (keystroke[0] === "\r".charCodeAt(0)) {
                callback();
            } else if (keystroke[0] === 0x03) {
                // ctrl-c
                process.exit();
            } else {
                wait();
            }
        });
    }
    wait();
}

function setup(turbo: Turbo): Target {
    const targetFactory = turbo.config.target;
    const target = targetFactory(turbo.env);
    target.on("stopped", () => {
        console.log("press enter to restart");
        waitForEnter(() => target.start());
    });

    return target;
}

export function target(turbo: Turbo): void {
    const id = uuid();
    const logger = createLogger("target");

    const sessionId = getCurrentSessionId(turbo.env);

    if (sessionId) {
        const target = setup(turbo);
        const client = new Client({ type: "managed", sessionId });

        target.on("started", (event: StartedEvent) => {
            client.action({
                type: "tarstart",
                id,
                interface: {
                    host: event.interface.host,
                    port: event.interface.port,
                },
            });
        });
        target.on("stopped", () => {
            client.action({
                type: "tarstop",
                id,
            });
        });

        client.on("ready", () => {
            target.start();
        });
        client.on("close", () => {
            target.stop();
        });

        process.on("SIGINT", () => {
            if (!target.isRunning) {
                process.exit();
            } else {
                target.stop();
                client.close();
            }
        });

        client.connectAfterDelay();
    } else {
        logger.error("unable to identify current session");
    }
}
