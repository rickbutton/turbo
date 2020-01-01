import { SourceLocation } from "@turbo/core";
import React from "react";
import { Box, ScrollableBox } from "../renderer";
import { useTurboState, useScriptSource } from "./helpers";

function numbers(height: number): JSX.Element[] {
    const width = String(height).length;
    const elements: JSX.Element[] = [];

    for (let i = 0; i < height; i++) {
        elements.push(<Box key={i}>{String(i + 1).padStart(width, " ")}</Box>);
    }
    return elements;
}

function gutter(height: number, loc: SourceLocation): JSX.Element[] {
    const elements: JSX.Element[] = [];
    for (let i = 0; i < height; i++) {
        if (i === loc.line) {
            elements.push(
                <Box key={i} color="red">
                    &gt;{" "}
                </Box>,
            );
        } else {
            elements.push(<Box key={i} height={1} width={2}></Box>);
        }
    }
    return elements;
}

export function Code(): JSX.Element {
    const state = useTurboState();
    const script = useScriptSource();

    if (state.target.runtime.paused) {
        const topCallFrame = state.target.runtime.callFrames[0];

        const lines = script.split("\n");
        const height = lines.length;
        const loc = topCallFrame.location;
        return (
            <ScrollableBox grow={1} direction="row">
                <Box direction="column">{numbers(height)}</Box>
                <Box direction="column">{gutter(height, loc)}</Box>
                <Box direction="column" grow={1}>
                    {lines.map((line, i) => (
                        <Box key={i}>{line}</Box>
                    ))}
                </Box>
            </ScrollableBox>
        );
    } else {
        return <Box>not paused</Box>;
    }
}
