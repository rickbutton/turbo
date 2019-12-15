import { Turbo, createLogger, Logger, State } from "@turbo/core";
import { Client } from "@turbo/net";
import { getCurrentSessionId } from "@turbo/tmux";
import * as readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

type Component = (client: Client, logger: Logger) => void;

export function component(turbo: Turbo, name: string): void {
    let state: State | null = null;

    const components: { [key: string]: Component } = {
        repl(client: Client, logger: Logger): void {
            function read(): void {
                rl.question("-> ", expr => {
                    if (!state) {
                        read(); // TODO: show user error
                        return;
                    }

                    if (expr === "/pause") {
                        client.pause().then(() => {
                            console.log("=> paused");
                            read();
                        });
                        return;
                    }

                    const runtime = state.target.runtime;
                    if (!runtime.paused) {
                        logger.error("target is not paused");
                        read();
                        return;
                    }

                    if (expr === "/resume") {
                        client.resume().then(() => {
                            console.log("=> resumed");
                            read();
                        });
                        return;
                    }

                    const topCallFrame = runtime.callFrames[0];

                    client
                        .eval(expr, topCallFrame.id)
                        .then(value => {
                            // TODO: this will eventually be a real remote object
                            // so we can't always just show it
                            console.log("=> " + value.value);
                            read();
                        })
                        .catch(error => {
                            logger.error(`eval error: ${error}`);
                            read();
                        });
                });
            }
            read();
        },
    };

    const logger = createLogger(`component:${name}`);

    const sessionId = getCurrentSessionId(turbo.env);
    const component = components[name];

    if (!component) {
        logger.error(`unknown component: ${name}`);
        return;
    }
    if (!sessionId) {
        logger.error("unable to identify current session");
        return;
    }

    const client = new Client({ type: "managed", sessionId });

    client.on("ready", () => {
        component(client, logger);
    });
    client.on("sync", s => {
        state = s;
    });

    rl.on("SIGINT", () => {
        rl.close();
        client.close();
        process.exit();
    });

    client.connectAfterDelay();
}
