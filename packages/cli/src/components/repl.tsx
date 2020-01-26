import { Client } from "@turbo/net";
import {
    logger,
    State,
    ScriptId,
    Script,
    uuid,
    BreakpointId,
} from "@turbo/core";
import React from "react";
import { Box, Input, ScrollableBox } from "../renderer";
import { Eval } from "./eval";
import { useClient } from "./helpers";

const PROMPT = "> ";

function js(str: string): string {
    return str;
}

const COMMANDS = [
    { type: "help", alts: ["h", "?"] },
    { type: "quit", alts: ["q"] },
    { type: "start", alts: ["run"] },
    { type: "stop", alts: [] },
    { type: "restart", alts: [] },
    { type: "pause", alts: ["p"] },
    { type: "resume", alts: ["r", "c"] },
    { type: "stepInto", alts: ["i", "stepi"] },
    { type: "stepOver", alts: ["n", "step", "stepOver"] },
    { type: "stepOut", alts: ["finish", "f"] },
    { type: "backtrace", alts: ["bt"] },
    { type: "break", alts: ["b"] },
    { type: "unbreak", alts: ["ub"] },
    { type: "breaks", alts: ["bs"] },
    { type: "eval", alts: ["e"] },
] as const;
interface Command {
    type: typeof COMMANDS[number]["type"];
    args: string;
}

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

function parse(input: string): Command | null {
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

function getScript(state: State, id: ScriptId | undefined): Script | undefined {
    return state ? state.target.scripts.find(s => s.id === id) : undefined;
}

function isInteger(str: string): boolean {
    const n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
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

    if (!cmd) {
        return <Box color="red">unable to parse command ${input}</Box>;
    } else if (cmd.type == "help") {
        return <Help />;
    } else if (cmd.type == "quit") {
        client.quit();
    } else if (isSimpleRuntimeCommand(cmd.type)) {
        client.dispatch({ type: cmd.type });
    } else if (cmd.type === "backtrace") {
        // TODO
        return null;
    } else if (cmd.type === "break" || cmd.type === "unbreak") {
        const scriptId = state.target.paused
            ? state.target.callFrames[0].location.scriptId
            : undefined;

        const script = getScript(state, scriptId);

        const parts = cmd.args.split(" ");
        const linePart = parts[0];
        const columnPart = parts[1];
        const hasLine = isInteger(linePart);
        const hasCol = isInteger(columnPart);

        if (!hasLine || (!hasCol && columnPart)) {
            return <Box color="red">invalid args to break</Box>;
        }
        if (!script) {
            return <Box color="red">unable to get script</Box>;
        }

        const line = Number(linePart) - 1;
        const column = hasCol ? Number(columnPart) - 1 : undefined;

        if (cmd.type === "break") {
            client.dispatch({
                type: "set-breakpoint",
                breakpoint: {
                    id: uuid() as BreakpointId,
                    line,
                    column,
                    url: script.url,
                    rawUrl: script.rawUrl,
                    raw: undefined,
                },
            });
        } else {
            const matches = state.target.breakpoints.filter(
                b =>
                    b.rawUrl === script.rawUrl &&
                    b.line === line &&
                    (!column || b.column === column),
            );
            for (const match of matches) {
                client.dispatch({
                    type: "remove-b-request",
                    id: match.id,
                });
            }
        }
    } else if (cmd.type === "breaks") {
        const breakpoints = state.target.breakpoints;
        return (
            <Box direction="column">
                {breakpoints.map((b, i) => (
                    <Box key={i}>
                        {b.url} - {b.line}:{b.column}
                    </Box>
                ))}
            </Box>
        );
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
