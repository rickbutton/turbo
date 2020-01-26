import { logger, LOGO, SourceLocation, Breakpoint } from "@turbo/core";
import React from "react";
import { Box, ScrollableBox } from "../renderer";
import { useClientState, useScriptSource, highlightJs } from "./helpers";

function numbers(height: number): string[] {
    const width = String(height).length;
    const elements: string[] = [];

    for (let i = 0; i < height; i++) {
        elements.push(String(i + 1).padStart(width, " "));
    }
    return elements;
}

function gutter(
    height: number,
    loc: SourceLocation,
    breakpoints: Breakpoint[],
): JSX.Element[] {
    const breakpointsByLine = breakpoints.reduce((map, breakpoint) => {
        map[breakpoint.line] = breakpoint;
        return map;
    }, {} as { [key: number]: Breakpoint });

    const elements: JSX.Element[] = [];
    for (let i = 0; i < height; i++) {
        if (i === loc.line) {
            elements.push(
                <Box key={i} height={1} width={2} color="red">
                    {" >"}
                </Box>,
            );
        } else if (breakpointsByLine[i]) {
            elements.push(
                <Box key={i} height={1} width={2} color="red">
                    {" 0"}
                </Box>,
            );
        } else {
            elements.push(
                <Box key={i} height={1} width={2}>
                    {"  "}
                </Box>,
            );
        }
    }
    return elements;
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
    const state = useClientState();
    const script = useScriptSource(
        state && state.target.paused
            ? state.target.callFrames[0].location.scriptId
            : undefined,
    );
    const highlighted = React.useMemo(() => highlightJs(script), [script]);

    if (!state) {
        return (
            <LogoText>
                <Box wrap={true}>
                    The component has not synced with the daemon.
                </Box>
            </LogoText>
        );
    } else if (state.target.paused) {
        const topCallFrame = state.target.callFrames[0];

        const lines = highlighted.split("\n");
        const height = lines.length;
        const loc = topCallFrame.location;
        return (
            <ScrollableBox grow={1} direction="row" desiredFocus={loc.line}>
                <Box direction="column">{numbers(height)}</Box>
                <Box direction="column">
                    {gutter(height, loc, state.target.breakpoints)}
                </Box>
                <Box direction="column" grow={1}>
                    {lines}
                </Box>
            </ScrollableBox>
        );
    } else if (state.target.connected) {
        return (
            <LogoText>
                <Box wrap={true}>The target is not paused.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can pause the target with the &quot;pause&quot; or
                    &quot;p&quot; commands in the repl.
                </Box>
            </LogoText>
        );
    } else {
        return (
            <LogoText>
                <Box wrap={true}>The target is not running.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can restart the target with the &quot;start&quot;
                    or &quot;restart&quot; commands in the repl.
                </Box>
            </LogoText>
        );
    }
}
