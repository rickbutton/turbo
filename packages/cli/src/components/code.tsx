import { Client } from "@turbo/net";
import { highlight } from "cli-highlight";
import { createLogger, SourceLocation } from "@turbo/core";
import React from "react";
import { useClientState, useScriptSource } from "./helpers";

const logger = createLogger("code");

interface Props {
    client: Client;
}

function markLocation(script: string, loc: SourceLocation): string {
    const lines = script.split("\n");

    return lines
        .map((line, i) => {
            if (i === loc.line) {
                return "> " + line;
            } else {
                return "  " + line;
            }
        })
        .join("\n");
}

export function Code(props: Props): JSX.Element {
    const state = useClientState(props.client);
    const script = useScriptSource(props.client, state);

    if (!state) {
        return <span>no state</span>;
    } else if (state.target.runtime.paused) {
        const topCallFrame = state.target.runtime.callFrames[0];

        return (
            <span>
                {highlight(markLocation(script, topCallFrame.location), {
                    language: "typescript",
                })}
            </span>
        );
    } else {
        return <span>not paused</span>;
    }
}
