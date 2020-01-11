import { Client } from "@turbo/net";
import { logger } from "@turbo/core";
import React from "react";
import { Box, Input, ScrollableBox } from "../renderer";
import { Eval } from "./eval";
import { useClient } from "./helpers";

const PROMPT = "> ";

function js(str: string): string {
    return str;
}

interface QuitCommand {
    type: "quit";
}
interface StartCommand {
    type: "start";
}
interface StopCommand {
    type: "stop";
}
interface RestartCommand {
    type: "restart";
}
interface PauseCommand {
    type: "pause";
}
interface ResumeCommand {
    type: "resume";
}
interface StepIntoCommand {
    type: "stepInto";
}
interface StepOutCommand {
    type: "stepOut";
}
interface StepOverCommand {
    type: "stepOver";
}
interface BackTraceCommand {
    type: "backtrace";
}
interface EvalComamnd {
    type: "eval";
    value: string;
}
interface ErrorCommand {
    type: "error";
    value: string;
}
type Command =
    | QuitCommand
    | StopCommand
    | StartCommand
    | RestartCommand
    | PauseCommand
    | ResumeCommand
    | StepIntoCommand
    | StepOutCommand
    | StepOverCommand
    | BackTraceCommand
    | ErrorCommand
    | EvalComamnd;

function matchesCommand(input: string, options: string[]): boolean {
    return options.some(o => input === o || input.startsWith(o + " "));
}

function parse(input: string): Command {
    const trimmed = input.trim();

    if (matchesCommand(trimmed, ["quit", "q"])) {
        return { type: "quit" };
    } else if (matchesCommand(trimmed, ["start", "run"])) {
        return { type: "start" };
    } else if (matchesCommand(trimmed, ["stop"])) {
        return { type: "stop" };
    } else if (matchesCommand(trimmed, ["restart"])) {
        return { type: "restart" };
    } else if (matchesCommand(trimmed, ["p", "pause"])) {
        return { type: "pause" };
    } else if (matchesCommand(trimmed, ["r", "c", "resume"])) {
        return { type: "resume" };
    } else if (matchesCommand(trimmed, ["s", "stepi", "stepInto"])) {
        return { type: "stepInto" };
    } else if (matchesCommand(trimmed, ["n", "step", "stepOver"])) {
        return { type: "stepOver" };
    } else if (matchesCommand(trimmed, ["f", "finish", "stepOut"])) {
        return { type: "stepOut" };
    } else if (matchesCommand(trimmed, ["bt", "backtrace"])) {
        return { type: "backtrace" };
    } else if (matchesCommand(trimmed, ["e", "eval"])) {
        return { type: "eval", value: input.replace(/^(e|eval) /, "") };
    } else {
        return { type: "eval", value: input };
    }
}

async function handle(
    input: string,
    client: Client,
): Promise<JSX.Element | null> {
    if (/^\s*$/.test(input)) {
        return null;
    }
    const state = client.state;
    if (!state) {
        return null;
    }
    const runtime = state.target.runtime;

    const cmd = parse(input);

    if (cmd.type === "error") {
        return <span>${cmd.value}</span>;
    } else if (cmd.type == "quit") {
        return client.quit().then(() => null);
    } else if (cmd.type == "start") {
        return client.start().then(() => null);
    } else if (cmd.type == "stop") {
        return client.stop().then(() => null);
    } else if (cmd.type == "restart") {
        return client.restart().then(() => null);
    } else if (cmd.type == "pause") {
        return client.pause().then(() => null);
    } else if (cmd.type === "resume") {
        return client.resume().then(() => null);
    } else if (cmd.type === "stepInto") {
        return client.stepInto().then(() => null);
    } else if (cmd.type === "stepOver") {
        return client.stepOver().then(() => null);
    } else if (cmd.type === "stepOut") {
        return client.stepOut().then(() => null);
    } else if (cmd.type === "backtrace") {
        return null;
    } else if (!runtime.paused) {
        return <span>not paused</span>; // TODO - better error? eval global?
    } else {
        const topCallFrame = runtime.callFrames[0];

        return client
            .eval(cmd.value, topCallFrame.id)
            .then(result => <Eval result={result} />)
            .catch(error => {
                return <span>`eval error: ${error}`</span>;
            });
    }
}

export function Repl(): JSX.Element {
    const client = useClient();
    const [lines, setLines] = React.useState<JSX.Element[]>([]);

    async function onSubmit(value: string): Promise<void> {
        const newLines = [
            ...lines,
            <span key={lines.length}>{PROMPT + js(value)}</span>,
        ];
        setLines(newLines);

        const output = await handle(value, client);
        if (output) {
            setLines([
                ...newLines,
                <span key={newLines.length}>{output}</span>,
            ]);
        }
    }

    return (
        <Box direction="column">
            <ScrollableBox direction="column" grow={1} snapToBottom={true}>
                {lines}
                <Input prompt={PROMPT} onSubmit={onSubmit} />
            </ScrollableBox>
        </Box>
    );
}
