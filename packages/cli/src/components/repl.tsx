import { logger, State } from "@turbo/core";
import React from "react";
import { Box, Input, ScrollableBox } from "../renderer";
import { ObjectView } from "./object";
import { TurboContext } from "../context";
import { useTurboContext, useTurboState } from "./helpers";

const PROMPT = "> ";

function js(str: string): string {
    return str;
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
interface EvalComamnd {
    type: "eval";
    value: string;
}
interface ErrorCommand {
    type: "error";
    value: string;
}
type Command =
    | PauseCommand
    | ResumeCommand
    | StepIntoCommand
    | StepOutCommand
    | StepOverCommand
    | ErrorCommand
    | EvalComamnd;

const COMMAND_PREFIX = ",";

function matchesCommand(input: string, options: string[]): boolean {
    return options.some(o => COMMAND_PREFIX + o === input.trimRight());
}

function parse(input: string): Command {
    const trimmed = input.trimRight();

    if (trimmed.startsWith(COMMAND_PREFIX)) {
        if (matchesCommand(trimmed, ["p", "pause"])) {
            return { type: "pause" };
        } else if (matchesCommand(trimmed, ["r", "c", "resume"])) {
            return { type: "resume" };
        } else if (matchesCommand(trimmed, ["s", "stepi", "stepInto"])) {
            return { type: "stepInto" };
        } else if (matchesCommand(trimmed, ["n", "step", "stepOver"])) {
            return { type: "stepOver" };
        } else if (matchesCommand(trimmed, ["f", "finish", "stepOut"])) {
            return { type: "stepOut" };
        } else {
            return {
                type: "error",
                value: `Invalid debugger command ${trimmed}`,
            };
        }
    } else {
        return { type: "eval", value: input };
    }
}

async function handle(
    input: string,
    context: TurboContext,
    state: State,
): Promise<JSX.Element | null> {
    if (/^\s*$/.test(input)) {
        return null;
    }
    const runtime = state.target.runtime;

    const cmd = parse(input);

    if (cmd.type == "pause") {
        return context.pause().then(() => null);
    } else if (cmd.type === "resume") {
        return context.resume().then(() => null);
    } else if (cmd.type === "stepInto") {
        return context.stepInto().then(() => null);
    } else if (cmd.type === "stepOver") {
        return context.stepOver().then(() => null);
    } else if (cmd.type === "stepOut") {
        return context.stepOut().then(() => null);
    } else if (cmd.type === "error") {
        return <Box>${cmd.value}</Box>;
    } else if (!runtime.paused) {
        return <Box>not paused</Box>; // TODO - better error? eval global?
    } else {
        const topCallFrame = runtime.callFrames[0];

        return context
            .eval(input, topCallFrame.id)
            .then(result => {
                if (result.error) {
                    return <Box>{result.value}</Box>;
                } else if (!result.success) {
                    return result.value.exception ? (
                        <ObjectView
                            simpleExceptions={true}
                            object={result.value.exception}
                        />
                    ) : (
                        <Box>{result.value.text}</Box>
                    );
                } else {
                    return <ObjectView object={result.value} />;
                }
            })
            .catch(error => {
                return <Box>`eval error: ${error}`</Box>;
            });
    }
}

export function Repl(): JSX.Element {
    const context = useTurboContext();
    const state = useTurboState();
    const [lines, setLines] = React.useState<JSX.Element[]>([]);

    async function onSubmit(value: string): Promise<void> {
        const newLines = [
            ...lines,
            <Box minHeight={1} key={lines.length}>
                {PROMPT + js(value)}
            </Box>,
        ];
        setLines(newLines);

        const output = await handle(value, context, state);
        if (output) {
            setLines([
                ...newLines,
                <Box minHeight={1} key={newLines.length}>
                    {output}
                </Box>,
            ]);
        }
    }

    return (
        <ScrollableBox
            direction="column"
            wrap={true}
            grow={1}
            snapToBottom={true}
        >
            {lines}
            <Input prompt={PROMPT} onSubmit={onSubmit} />
        </ScrollableBox>
    );
}
