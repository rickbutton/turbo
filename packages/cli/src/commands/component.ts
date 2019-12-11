import { Turbo, createLogger, Logger, State } from "@turbo/core";
import { Client } from "@turbo/net";
import { getCurrentSessionId } from "@turbo/tmux";
import * as readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

type Component = (client: Client, logger: Logger) => void;
const components: { [key: string]: Component } = {
    repl(client: Client, logger: Logger): void {
        function read(): void {
            rl.question("-> ", expr => {
                client
                    .eval(expr)
                    .then(value => {
                        console.log("=> " + JSON.stringify(value));
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

export function component(turbo: Turbo, name: string): void {
    const logger = createLogger(`component:${name}`);

    const sessionId = getCurrentSessionId(turbo.env);
    if (sessionId) {
        const client = new Client({ type: "managed", sessionId });

        client.on("sync", (_: State) => {});
        client.on("ready", () => {
            const component = components[name];
            if (component) {
                component(client, logger);
            }
        });

        client.connect();
    } else {
        logger.error("unable to identify current session");
    }
}
