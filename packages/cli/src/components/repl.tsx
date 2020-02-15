import { Client } from "@turbo/net";
import { logger, Turbo } from "@turbo/core";
import React from "react";
import { Box, Input, ScrollableBox } from "../renderer";
import { Eval } from "./eval";
import { useClient, useTurbo } from "./helpers";
import { Breakpoints } from "./breakpoints";
import { Stack } from "./stack";
import { setBreakpoint, removeBreakpoint } from "./actions";
import { Scopes } from "./scope";

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
    { type: "stack", alts: ["backtrace", "bt"] },
    { type: "break", alts: ["b"] },
    { type: "unbreak", alts: ["ub"] },
    { type: "breaks", alts: ["bs"] },
    { type: "scopes", alts: [] },
    { type: "eval", alts: ["e"] },
    { type: "up", alts: [] },
    { type: "down", alts: [] },
] as const;
interface Command {
    type: typeof COMMANDS[number]["type"];
    args: string;
}

const SIMPLE_RUNTIME_COMMANDS = {
    start: "start",
    stop: "stop",
    restart: "restart",
    pause: "pause",
    resume: "resume",
    stepInto: "stepInto",
    stepOver: "stepOver",
    stepOut: "stepOut",
    up: "focus-up",
    down: "focus-down",
} as const;
type SimpleRuntimeCommand = keyof typeof SIMPLE_RUNTIME_COMMANDS;
function isSimpleRuntimeCommand(
    type: Command["type"],
): type is SimpleRuntimeCommand {
    return Object.keys(SIMPLE_RUNTIME_COMMANDS).includes(type as any);
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

function isInteger(str: string): boolean {
    const n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
}

async function handle(
    turbo: Turbo,
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
        client.dispatch({ type: SIMPLE_RUNTIME_COMMANDS[cmd.type] });
    } else if (cmd.type === "stack") {
        if (state.target.paused) {
            return (
                <Stack
                    callFrames={state.target.callFrames}
                    scripts={state.target.scripts}
                    interactive={false}
                />
            );
        } else {
            return <Box color="red">not paused</Box>;
        }
    } else if (cmd.type === "break" || cmd.type === "unbreak") {
        const scriptId = state.target.paused
            ? state.target.callFrames[state.target.focusedCallFrame].location
                  .scriptId
            : undefined;

        const script = state.target.scripts.find(s => s.id === scriptId);

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
            client.dispatch(setBreakpoint(script, line, column));
        } else {
            const matches = state.target.breakpoints.filter(
                b =>
                    b.rawUrl === script.rawUrl &&
                    b.line === line &&
                    (!column || b.column === column),
            );
            for (const match of matches) {
                client.dispatch(removeBreakpoint(match.id));
            }
        }
    } else if (cmd.type === "breaks") {
        return <Breakpoints breakpoints={state.target.breakpoints} />;
    } else if (cmd.type === "scopes") {
        if (state.target.paused) {
            const callFrame =
                state.target.callFrames[state.target.focusedCallFrame];
            return <Scopes callFrame={callFrame} />;
        } else {
            return <Box>cannot get scopes, not paused</Box>;
        }
    } else if (!target.paused) {
        return <span>not paused</span>; // TODO - better error? eval global?
    } else {
        const callFrame = target.callFrames[target.focusedCallFrame];

        return client
            .eval(cmd.args, callFrame.id)
            .then(result => <Eval result={result} />)
            .catch(error => {
                return <span>`eval error: ${error}`</span>;
            });
    }

    return null;
}

export function Repl(): JSX.Element {
    const client = useClient();
    const turbo = useTurbo();
    const [lines, setLines] = React.useState<JSX.Element[]>([]);

    async function onSubmit(value: string): Promise<void> {
        const newLines = [
            ...lines,
            <span key={lines.length}>{PROMPT + js(value)}</span>,
        ];
        setLines(newLines);

        const output = await handle(turbo, value, client);
        if (output) {
            setLines([
                ...newLines,
                <span key={newLines.length}>{output}</span>,
            ]);
        }
    }

    return (
        <Box direction="column">
            <Box marginBottom={1} bg={"brightWhite"} color={"black"}>
                repl
            </Box>
            <ScrollableBox direction="column" grow={1} snapToBottom={true}>
                {lines}
                <Input prompt={PROMPT} onSubmit={onSubmit} />
            </ScrollableBox>
        </Box>
    );
}
