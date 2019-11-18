import * as yargs from "yargs";
import { start } from "./commands/start";
import { component } from "./commands/component";
import { daemon } from "./commands/daemon";
import { target } from "./commands/target";
import { getJug } from "@jug/core";

const jug = getJug();

yargs
    .command(["start", "$0"], "start a jug session", {}, () => {
        start(jug);
    })
    .command("component <name>", "start a jug component", {}, argv => {
        const name = argv.name as string;
        return component(jug, name);
    })
    .command("daemon", "start a jug daemon", {}, () => {
        return daemon(jug);
    })
    .command("target", "start a jug target watcher", {}, () => {
        " test";
        return target(jug);
    })
    .help().argv;
