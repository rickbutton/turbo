import React from "react";
import { useClientState, useTurbo, getScript, useClient } from "./helpers";
import { Box } from "../renderer";
import { logger } from "@turbo/core";

export function Stack(): JSX.Element {
    const client = useClient();
    const turbo = useTurbo();
    const state = useClientState();
    if (!state) return <Box />;

    if (!state.target.paused) {
        return <Box>not paused</Box>;
    }

    function onClick(frame: number): void {
        logger.verbose("will focus " + frame);
        client.dispatch({ type: "focus", frame });
    }

    return (
        <Box direction="column">
            {state.target.callFrames.map((f, i) => {
                const script = getScript(state, f.location.scriptId);
                if (script) {
                    const url = turbo.env.cleanPath(script.url);
                    return (
                        <Box key={i} onClick={(): void => onClick(i)}>
                            <Box color="red">
                                {i === state.target.focusedCallFrame
                                    ? "> "
                                    : "  "}
                            </Box>
                            {f.functionName || "<anonymous>"} ({url}:
                            {f.location.line + 1}
                            {f.location.column !== undefined
                                ? `:${f.location.column + 1}`
                                : ""}
                            )
                        </Box>
                    );
                } else {
                    return <Box />;
                }
            })}
        </Box>
    );
}
