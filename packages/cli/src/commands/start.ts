import { generateTmuxStartCommand, generateSessionId } from "@jug/tmux";
import { Jug, Layout } from "@jug/core";
import * as ffi from "ffi";
import * as ref from "ref";
import * as ArrayType from "ref-array";

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

const stringArray = ArrayType("string");

function getFd(v: any): void {
    return v._handle.fd;
}

function execvp(command: string, args: string[]): void {
    if (args.length === 0) {
        throw new Error("invalid args to execvp");
    }

    const current = ffi.Library((null as unknown) as string, {
        execvp: ["int", ["string", stringArray]],
        dup2: ["int", ["int", "int"]],
    });
    current.dup2(getFd(process.stdin), 0);
    current.dup2(getFd(process.stdout), 1);
    current.dup2(getFd(process.stderr), 2);

    return current.execvp(command, [
        command,
        ...args.slice(),
        (ref.NULL as unknown) as string[],
    ]);
}

export function start(jug: Jug): void {
    const id = generateSessionId();

    const layout = jug.config.layout || defaultLayout;

    const { command, args } = generateTmuxStartCommand(id, layout, jug);
    console.log(args);

    // replace current process with spawned tmux
    execvp(command, args);
}
