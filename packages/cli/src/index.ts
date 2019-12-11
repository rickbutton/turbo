import * as yargs from "yargs";
import { start } from "./commands/start";
import { component } from "./commands/component";
import { daemon } from "./commands/daemon";
import { target } from "./commands/target";
import { getTurbo } from "@turbo/core";

const turbo = getTurbo();

yargs
    .command(["start", "$0"], "start a turbo session", {}, () => {
        start(turbo);
    })
    .command("component <name>", "start a turbo component", {}, argv => {
        const name = argv.name as string;
        return component(turbo, name);
    })
    .command("daemon", "start a turbo daemon", {}, () => {
        return daemon(turbo);
    })
    .command("target", "start a turbo target watcher", {}, () => {
        " test";
        return target(turbo);
    })
    .help().argv;
