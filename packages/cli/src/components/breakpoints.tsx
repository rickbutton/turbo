import React from "react";
import { useClientState, useTurbo } from "./helpers";
import { Box } from "../renderer";

export function Breakpoints(): JSX.Element {
    const turbo = useTurbo();
    const state = useClientState();
    if (!state) return <Box />;

    return (
        <Box direction="column">
            <Box marginBottom={1}>breakpoints</Box>
            {state.target.breakpoints.map((b, i) => (
                <Box key={i}>
                    {turbo.env.cleanPath(b.url)} - {b.line}:{b.column}
                </Box>
            ))}
        </Box>
    );
}
