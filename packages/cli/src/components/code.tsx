import { logger, LOGO, Breakpoint } from "@turbo/core";
import React from "react";
import { Box, ScrollableBox } from "../renderer";
import {
    useClientState,
    highlightJs,
    useFocusedCallFrame,
    useScriptSource,
    useClient,
    useTurbo,
} from "./helpers";
import { setBreakpoint, removeBreakpoint } from "./actions";

interface CodeLineProps {
    index: number;
    line: string;
    height: number;
    highlightCallFrame: boolean;
    highlightBreakpoint: boolean;
    onClick?(index: number): void;
}
function CodeLine(props: CodeLineProps): JSX.Element {
    const width = String(props.height).length;

    function onClick(): void {
        if (props.onClick) {
            props.onClick(props.index);
        }
    }

    let gutterBg: string | undefined;
    if (props.highlightBreakpoint) {
        gutterBg = "red";
    }

    return (
        <Box onClick={onClick}>
            <Box height={1} bg={gutterBg} width={width}>
                {String(props.index + 1).padStart(width, " ")}
            </Box>
            <Box color="yellow" bg={gutterBg} width={2} height={1}>
                {props.highlightCallFrame ? " ▶" : "  "}
            </Box>
            <Box>{props.line || " "}</Box>
        </Box>
    );
}

interface CodeLinesProps {
    lines: string[];
    onClick?(index: number): void;
}
function CodeLines(props: CodeLinesProps): JSX.Element {
    const state = useClientState();
    const callFrame = useFocusedCallFrame();

    if (state === null) return <Box />;

    const breakpoints = state.target.breakpoints;
    const breakpointsByLine = breakpoints.reduce((map, breakpoint) => {
        map[breakpoint.line] = breakpoint;
        return map;
    }, {} as { [key: number]: Breakpoint });

    return (
        <Box direction="column">
            {props.lines.map((l, i) => (
                <CodeLine
                    index={i}
                    line={l}
                    height={props.lines.length}
                    highlightCallFrame={Boolean(
                        callFrame && i === callFrame.location.line,
                    )}
                    highlightBreakpoint={Boolean(breakpointsByLine[i])}
                    onClick={props.onClick}
                    key={i}
                />
            ))}
        </Box>
    );
}

function LogoText(props: React.PropsWithChildren<{}>): JSX.Element {
    return (
        <Box direction="column">
            <Box direction="column">{LOGO.split("\n")}</Box>
            {props.children}
        </Box>
    );
}

export function Code(): JSX.Element {
    const turbo = useTurbo();
    const client = useClient();
    const state = useClientState();
    const callFrame = useFocusedCallFrame();
    const script =
        state && callFrame
            ? state.target.scripts.find(
                  s => s.id === callFrame.location.scriptId,
              )
            : null;
    const source = useScriptSource(
        callFrame ? callFrame.location.scriptId : undefined,
    );
    const lines = React.useMemo(() => highlightJs(source).split("\n"), [
        source,
    ]);

    function onLineClick(line: number): void {
        if (!state || !script) return;

        const matches = state.target.breakpoints.filter(b => b.line === line);

        if (matches.length > 0) {
            for (const match of matches) {
                client.dispatch(removeBreakpoint(match.id));
            }
        } else {
            client.dispatch(setBreakpoint(script, line));
        }
    }

    let content: JSX.Element;
    if (!state) {
        content = (
            <LogoText>
                <Box wrap={true}>
                    The component has not synced with the daemon.
                </Box>
            </LogoText>
        );
    } else if (state.target.paused && callFrame) {
        const loc = callFrame.location;
        content = (
            <ScrollableBox grow={1} direction="row" desiredFocus={loc.line}>
                <CodeLines lines={lines} onClick={onLineClick} />
            </ScrollableBox>
        );
    } else if (state.target.connected) {
        content = (
            <LogoText>
                <Box wrap={true}>The target is not paused.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can pause the target with the &quot;pause&quot; or
                    &quot;p&quot; commands in the repl.
                </Box>
            </LogoText>
        );
    } else {
        content = (
            <LogoText>
                <Box wrap={true}>The target is not running.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can restart the target with the &quot;start&quot;
                    or &quot;restart&quot; commands in the repl.
                </Box>
            </LogoText>
        );
    }

    let title = "";
    if (script) {
        title = turbo.env.cleanPath(script.url);
    }

    return (
        <Box direction="column" grow={1}>
            <Box bg={"brightWhite"} color={"black"}>
                {title}
            </Box>
            {content}
        </Box>
    );
}
