#!/usr/bin/env node

// TODO: fix this in yoga-layout-prebuilt
process.on("uncaughtException", e => {
    console.error(e.message);
    console.error(e.stack);
});

import * as yargs from "yargs";
import { start } from "./commands/start";
import { component } from "./commands/component";
import { evaluate } from "./commands/eval";
import { daemon } from "./commands/daemon";
import { getTurbo, TurboOptions, Turbo } from "@turbo/core";

function getOptions(argv: any): TurboOptions {
    return {
        sessionId: argv.session || undefined,
    };
}

function makeTurbo(argv: any): Turbo {
    return getTurbo(getOptions(argv));
}

yargs
    .help()
    .option("session", {
        describe: "the desired session id",
        alias: ["s"],
    })
    .command(["start", "$0"], "start a turbo session", {}, argv => {
        const turbo = makeTurbo(argv);

        start(turbo);
    })
    .command("component <name>", "start a turbo component", {}, argv => {
        const turbo = makeTurbo(argv);

        const name = argv.name as string;
        return component(turbo, name);
    })
    .command("eval <expr>", "evaluate an expression", {}, argv => {
        const turbo = makeTurbo(argv);

        const expr = argv.expr as string;
        return evaluate(turbo, expr);
    })
    .command("daemon", "start a turbo daemon", {}, argv => {
        const turbo = makeTurbo(argv);

        return daemon(turbo);
    }).argv;
