import { Turbo, createLogger, Logger } from "@turbo/core";
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

export function component(turbo: Turbo, name: string): void {
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

    rl.on("SIGINT", () => {
        rl.close();
        client.close();
        process.exit();
    });

    client.connectAfterDelay();
}
