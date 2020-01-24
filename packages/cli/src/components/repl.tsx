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

interface HelpCommand {
    type: "help";
    args: string;
}
interface QuitCommand {
    type: "quit";
    args: string;
}
interface StartCommand {
    type: "start";
    args: string;
}
interface StopCommand {
    type: "stop";
    args: string;
}
interface RestartCommand {
    type: "restart";
    args: string;
}
interface PauseCommand {
    type: "pause";
    args: string;
}
interface ResumeCommand {
    type: "resume";
    args: string;
}
interface StepIntoCommand {
    type: "stepInto";
    args: string;
}
interface StepOutCommand {
    type: "stepOut";
    args: string;
}
interface StepOverCommand {
    type: "stepOver";
    args: string;
}
interface BackTraceCommand {
    type: "backtrace";
    args: string;
}
interface EvalComamnd {
    type: "eval";
    args: string;
}
interface ErrorCommand {
    type: "error";
    args: string;
}
type Command =
    | HelpCommand
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

interface CommandObject {
    type: Command["type"];
    alts?: string[];
}
const COMMANDS: CommandObject[] = [
    { type: "help", alts: ["h", "?"] },
    { type: "quit", alts: ["q"] },
    { type: "start", alts: ["run"] },
    { type: "stop" },
    { type: "restart" },
    { type: "pause", alts: ["p"] },
    { type: "resume", alts: ["r", "c"] },
    { type: "stepInto", alts: ["i", "stepi"] },
    { type: "stepOver", alts: ["n", "step", "stepOver"] },
    { type: "stepOut", alts: ["finish", "f"] },
    { type: "backtrace", alts: ["bt"] },
    { type: "eval", alts: ["e"] },
];

const SIMPLE_RUNTIME_COMMANDS = [
    "start",
    "stop",
    "restart",
    "pause",
    "resume",
    "stepInto",
    "stepOver",
    "stepOut",
] as const;
type SimpleRuntimeCommand = typeof SIMPLE_RUNTIME_COMMANDS[number];
function isSimpleRuntimeCommand(
    type: Command["type"],
): type is SimpleRuntimeCommand {
    return SIMPLE_RUNTIME_COMMANDS.includes(type as any);
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
function getCommandArgs(command: string, input: string): string {
    return input.replace(RegExp(`^${escapeRegExp(command)}`), "").trim();
}
function findCommandMatch(
    input: string,
    options: string[],
): string | undefined {
    const e = escapeRegExp;
    return options.find(o => RegExp(`^${e(o)}\\s+`).test(input) || o === input);
}

function parse(input: string): Command {
    for (const command of COMMANDS) {
        const options = [command.type, ...(command.alts || [])];
        const match = findCommandMatch(input, options);

        if (match) {
            const args = getCommandArgs(match, input);
            return { type: command.type, args: args };
        }
    }
    return { type: "eval", args: input };
}

function Help(): JSX.Element {
    return (
        <Box direction="column">
            <Box>turbo help:</Box>
            <Box />
            {COMMANDS.map((c, i) => (
                <Box key={i}>
                    {c.type}
                    {c.alts ? ` - ${c.alts.join(",")}` : ""}
                </Box>
            ))}
        </Box>
    );
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
    const target = state.target;
    const trimmed = input.trim();

    const cmd = parse(trimmed);

    if (cmd.type == "help") {
        return <Help />;
    } else if (cmd.type === "error") {
        return <Box color="red">unable to parse command ${input}</Box>;
    } else if (cmd.type == "quit") {
        return (
            <Box color="red" wrap={true}>
                I removed the quit option during a refactor and haven&apos;t put
                it back yet!
            </Box>
        );
    } else if (isSimpleRuntimeCommand(cmd.type)) {
        client.dispatch({ type: cmd.type });
    } else if (cmd.type === "backtrace") {
        // TODO
        return null;
    } else if (!target.paused) {
        return <span>not paused</span>; // TODO - better error? eval global?
    } else {
        const topCallFrame = target.callFrames[0];

        return client
            .eval(cmd.args, topCallFrame.id)
            .then(result => <Eval result={result} />)
            .catch(error => {
                return <span>`eval error: ${error}`</span>;
            });
    }

    return null;
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
