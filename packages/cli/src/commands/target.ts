import { getJug } from "@jug/core";
import * as process from "process";

function waitForEnter(callback: () => void): void {
    function wait(): void {
        console.log("wait");
        process.stdin.setRawMode(true);
        process.stdin.once("data", keystroke => {
            console.log(keystroke);
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

export function target(): void {
    const jug = getJug();

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
        console.log(target.isRunning);
        if (!target.isRunning) {
            process.exit();
        }
    });

    target.start();
}
