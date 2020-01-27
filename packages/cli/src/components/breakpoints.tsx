import React from "react";
import { useClientState, useTurbo } from "./helpers";
import { Box } from "../renderer";
import { Breakpoint } from "@turbo/core";

interface Props {
    breakpoints?: Breakpoint[];
}
export function Breakpoints(props: Props): JSX.Element {
    const turbo = useTurbo();
    const state = useClientState();
    if (!state) return <Box />;

    const breakpoints = props.breakpoints || state.target.breakpoints;
    return (
        <Box direction="column">
            <Box marginBottom={1}>breakpoints</Box>
            {breakpoints.map((b, i) => (
                <Box key={i}>
                    {turbo.env.cleanPath(b.url)} - {b.line}:{b.column}
                </Box>
            ))}
        </Box>
    );
}
