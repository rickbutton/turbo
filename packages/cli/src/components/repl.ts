import * as readline from "readline";
import { highlight } from "cli-highlight";
import { Client } from "@turbo/net";
import { Logger, State } from "@turbo/core";
// TODO: replace node-color-readline with
// something more stable

export function repl(
    client: Client,
    logger: Logger,
    getState: () => State | null,
): void {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    function read(): void {
        rl.prompt();
    }

    rl.on("line", (line: string) => {
        const state = getState();

        if (!state) {
            read();
            return;
        }

        if (line === "/pause") {
            client.pause().then(() => {
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

        if (line === "/resume") {
            client.resume().then(() => {
                read();
            });
            return;
        }

        const topCallFrame = runtime.callFrames[0];

        client
            .eval(line, topCallFrame.id)
            .then(value => {
                // TODO: this will eventually be a real remote object
                // so we can't always just show it
                console.log(highlight(value.value, { language: "json" }));
                read();
            })
            .catch(error => {
                logger.error(`eval error: ${error}`);
                read();
            });
    });

    rl.prompt();
}
