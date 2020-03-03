import React from "react";
import { Box, ScrollableBox } from "../renderer";
import { ObjectView } from "./object";
import { CallFrame } from "@turbo/core";
import { useClientState } from "./helpers";

interface Props {
    callFrame: CallFrame;
}
export function Scopes(props: Props): JSX.Element {
    return (
        <Box direction="column">
            {props.callFrame.scopes.map((s, i) => (
                <Box key={i}>
                    <ObjectView value={s.object} />
                </Box>
            ))}
        </Box>
    );
}

export function ScopesComponent(): JSX.Element {
    const state = useClientState();

    let content: JSX.Element | null;
    if (state && !state.target.paused) {
        content = <Box>not paused</Box>;
    } else if (state && state.target.paused) {
        const callFrame =
            state.target.callFrames[state.target.focusedCallFrame];
        if (callFrame) {
            content = <Scopes callFrame={callFrame} />;
        } else {
            content = <Box>missing call frame</Box>;
        }
    } else {
        content = null;
    }

    return (
        <Box direction="column" grow={1}>
            <Box marginBottom={1} bg={"brightWhite"} color={"black"}>
                scopes
            </Box>
            <ScrollableBox grow={1}>{content}</ScrollableBox>
        </Box>
    );
}
