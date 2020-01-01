#!/usr/bin/env node

process.on("uncaughtException", e => {
    console.error(e.message);
    console.error(e.stack);
    process.exit(1);
});

import yargs from "yargs";
import { logger, TurboOptions, Environment } from "@turbo/core";
import { getEnvironment } from "./env";
import { makeContext } from "./context";
import { renderApp } from "./app";

const LOGO =
    "   __             __        \n" +
    "  / /___  _______/ /_  ____ \n" +
    " / __/ / / / ___/ __ \\/ __ \\\n" +
    "/ /_/ /_/ / /  / /_/ / /_/ /\n" +
    "\\__/\\__,_/_/  /_.___/\\____/\n ";
const argv: any = yargs.usage(LOGO).help().argv;

function getOptions(argv: any): TurboOptions {
    return {
        sessionId: argv.session || undefined,
    };
}

function makeEnvironment(argv: any): Environment {
    return getEnvironment(getOptions(argv));
}

function start(argv: any): void {
    const env = makeEnvironment(argv);
    const context = makeContext(env);
    context.start();

    process.on("exit", () => {
        context.stop();
    });

    renderApp({ context });
}

start(argv);
