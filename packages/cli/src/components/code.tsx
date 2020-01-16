import { LOGO, SourceLocation } from "@turbo/core";
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

function gutter(height: number, loc: SourceLocation): JSX.Element[] {
    const elements: JSX.Element[] = [];
    for (let i = 0; i < height; i++) {
        if (i === loc.line) {
            elements.push(
                <Box key={i} height={1} width={2} color="red">
                    {" >"}
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

export function Code(): JSX.Element {
    const state = useClientState();
    const script = useScriptSource();
    const highlighted = React.useMemo(() => highlightJs(script), [script]);

    if (!state) {
        return <span>no state</span>;
    } else if (state.target.runtime.paused) {
        const topCallFrame = state.target.runtime.callFrames[0];

        const lines = highlighted.split("\n");
        const height = lines.length;
        const loc = topCallFrame.location;
        return (
            <ScrollableBox grow={1} direction="row" desiredFocus={loc.line}>
                <Box direction="column">{numbers(height)}</Box>
                <Box direction="column">{gutter(height, loc)}</Box>
                <Box direction="column" grow={1}>
                    {lines}
                </Box>
            </ScrollableBox>
        );
    } else {
        return (
            <Box direction="column">
                <Box direction="column">{LOGO.split("\n")}</Box>
                <Box wrap={true}>The target is not running.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can restart the target with the
                    &quot;restart&quot; command in the repl.
                </Box>
            </Box>
        );
    }
}
