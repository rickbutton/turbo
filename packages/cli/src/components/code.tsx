import { Client } from "@turbo/net";
import { highlight } from "cli-highlight";
import { SourceLocation } from "@turbo/core";
import React from "react";
import chalk from "chalk";
import { Box } from "ink";
import { useClientState, useScriptSource } from "./helpers";

interface Props {
    client: Client;
}

function numbers(height: number): string {
    const width = String(height).length;
    let str = "";

    for (let i = 0; i < height; i++) {
        str += String(i + 1).padStart(width, " ") + " \n";
    }
    return str;
}

function gutter(height: number, loc: SourceLocation): string {
    let str = "";
    for (let i = 0; i < height; i++) {
        if (i === loc.line) {
            str += chalk.red("> ") + "\n";
        } else {
            str += "  \n";
        }
    }
    return str;
}

export function Code(props: Props): JSX.Element {
    const state = useClientState(props.client);
    const script = useScriptSource(props.client, state);

    if (!state) {
        return <span>no state</span>;
    } else if (state.target.runtime.paused) {
        const topCallFrame = state.target.runtime.callFrames[0];

        const height = script.split("\n").length; // TODO, too many allocs
        const loc = topCallFrame.location;
        //{highlight(script, { language: "typescript" })}
        return (
            <Box flexDirection="row">
                <Box flexShrink={1}>{numbers(height)}</Box>
                <Box flexShrink={1}>{gutter(height, loc)}</Box>
                <Box flexGrow={1}>
                    {highlight(script, { language: "typescript" })}
                </Box>
            </Box>
        );
    } else {
        return <span>not paused</span>;
    }
}
