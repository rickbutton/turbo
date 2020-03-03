import React from "react";
import { useClientState, useTurbo } from "./helpers";
import { Box } from "../renderer";
import { Breakpoint, logger } from "@turbo/core";

interface Props {
    breakpoints: Breakpoint[];
}
export function Breakpoints(props: Props): JSX.Element {
    const turbo = useTurbo();
    return (
        <Box direction="column">
            {props.breakpoints.map((b, i) => (
                <Box key={i}>
                    {turbo.env.cleanPath(b.url)}::{b.line + 1}:{b.column}
                </Box>
            ))}
        </Box>
    );
}

export function BreakpointsComponent(): JSX.Element {
    const state = useClientState();

    const breakpoints = state ? state.target.breakpoints : [];

    return (
        <Box direction="column" grow={1}>
            <Box marginBottom={1} bg={"brightWhite"} color={"black"}>
                breakpoints
            </Box>
            <Breakpoints breakpoints={breakpoints} />
        </Box>
    );
}
