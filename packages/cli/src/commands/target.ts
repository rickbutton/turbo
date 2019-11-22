import { Jug } from "@jug/core";
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

export function target(jug: Jug): void {
    const targetFactory = jug.config.target;
    const target = targetFactory(jug.env);

    target.on("started", () => {});
    target.on("stopped", () => {
        console.log("press enter to restart");
        waitForEnter(() => {
            target.start();
        });
    });

    process.on("SIGINT", () => {
        if (!target.isRunning) {
            process.exit();
        }
    });

    target.start();
}
