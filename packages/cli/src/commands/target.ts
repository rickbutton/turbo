import { Turbo, StartedEvent, createLogger, Target } from "@turbo/core";
import { getCurrentSessionId } from "@turbo/tmux";
import { Client } from "@turbo/net";
import process from "process";

// TODO: this shouldn't touch stdin config, because sharing stdio with child
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
    const logger = createLogger("target");
    function handleException(error: Error): void {
        logger.error(error.message);
        process.exit(1);
    }
    function handleError(res: { error?: string }): void {
        if (res.error) {
            logger.error(res.error);
            process.exit(1);
        }
    }

    const sessionId = getCurrentSessionId(turbo.env);

    if (sessionId) {
        const target = setup(turbo);
        const client = new Client({ type: "managed", sessionId });

        client.on("ready", () => {
            client
                .registerTarget()
                .then(handleError)
                .catch(handleException)
                .then(() => target.start());
        });

        target.on("started", (event: StartedEvent) => {
            client
                .updateTarget({
                    host: event.interface.host,
                    port: event.interface.port,
                })
                .then(handleError)
                .catch(handleException);
        });

        target.on("stopped", () => {
            client
                .updateTarget(undefined)
                .then(handleError)
                .catch(handleException);
        });

        target.on("data", data => {
            console.log(data);
        });

        client.on("close", () => {
            target.stop();
        });

        process.on("SIGINT", () => {
            if (!target.isRunning) {
                process.exit();
            } else {
                target.stop();
            }
        });

        client.connectAfterDelay();
    } else {
        logger.error("unable to identify current session");
    }
}
