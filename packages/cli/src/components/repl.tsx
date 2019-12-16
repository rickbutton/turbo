import { highlight } from "cli-highlight";
import { Client } from "@turbo/net";
import { createLogger } from "@turbo/core";
import React from "react";
import { Static } from "ink";
import { Input } from "./input";
import { ObjectView } from "./object";

const logger = createLogger("repl");
const PROMPT = "> ";

function js(str: string): string {
    return highlight(str, { language: "typescript" });
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

    if (cmd.type == "pause") {
        return client.pause().then(() => null);
    } else if (cmd.type === "resume") {
        return client.resume().then(() => null);
    } else if (cmd.type === "stepInto") {
        return client.stepInto().then(() => null);
    } else if (cmd.type === "stepOver") {
        return client.stepOver().then(() => null);
    } else if (cmd.type === "stepOut") {
        return client.stepOut().then(() => null);
    } else if (cmd.type === "error") {
        return <span>${cmd.value}</span>;
    } else if (!runtime.paused) {
        return <span>not paused</span>; // TODO - better error? eval global?
    } else {
        const topCallFrame = runtime.callFrames[0];

        return client
            .eval(input, topCallFrame.id)
            .then(result => {
                if (result.error) {
                    return <span>{result.value}</span>;
                } else if (!result.success) {
                    return result.value.exception ? (
                        <ObjectView
                            simpleExceptions={true}
                            object={result.value.exception}
                        />
                    ) : (
                        <span>{result.value.text}</span>
                    );
                } else {
                    return <ObjectView object={result.value} />;
                }
            })
            .catch(error => {
                return <span>`eval error: ${error}`</span>;
            });
    }
}

interface Props {
    client: Client;
}
export function Repl(props: Props): JSX.Element {
    const [lines, setLines] = React.useState<JSX.Element[]>([]);

    async function onSubmit(value: string): Promise<void> {
        const newLines = [
            ...lines,
            <span key={lines.length}>{PROMPT + js(value)}</span>,
        ];
        setLines(newLines);

        const output = await handle(value, props.client);
        if (output) {
            setLines([
                ...newLines,
                <span key={newLines.length}>{output}</span>,
            ]);
        }
    }

    return (
        <span>
            <Static>{lines}</Static>
            <Input prompt={PROMPT} onSubmit={onSubmit} />
        </span>
    );
}
