import React from "react";
import { useClientState, useTurbo, useClient } from "./helpers";
import { Box } from "../renderer";
import { logger, CallFrame, Script } from "@turbo/core";

interface ShrinkTextProps {
    text: string;
}
interface Props {
    scripts: Script[];
    callFrames: CallFrame[];
    focusedCallFrame?: number;
    interactive: boolean;
}
export function Stack(props: Props): JSX.Element {
    const client = useClient();
    const turbo = useTurbo();

    function onClick(frame: number): void {
        if (props.interactive) {
            client.dispatch({ type: "focus", frame });
        }
    }

    return (
        <Box direction="column">
            {props.callFrames.map((f, i) => {
                const script = props.scripts.find(
                    s => s.id === f.location.scriptId,
                );
                let gutter = "  ";
                if (typeof props.focusedCallFrame === "number") {
                    gutter = i === props.focusedCallFrame ? "> " : "  ";
                }
                if (script) {
                    const url = turbo.env.cleanPath(script.url);
                    const fileName = turbo.env.fileNameFromPath(url);
                    return (
                        <Box key={i} onClick={(): void => onClick(i)}>
                            <Box color="red" width={2}>
                                {gutter}
                            </Box>
                            <Box shrink={1}>
                                {f.functionName || "<anonymous>"}
                            </Box>{" "}
                            (<Box shrink={1}>{fileName}</Box>:
                            <Box>
                                {f.location.line + 1}
                                {f.location.column !== undefined
                                    ? `:${f.location.column + 1}`
                                    : ""}
                            </Box>
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

export function StackComponent(): JSX.Element {
    const state = useClientState();

    return (
        <Box direction="column" grow={1}>
            <Box marginBottom={1} bg={"brightWhite"} color={"black"}>
                call frames
            </Box>
            {!state || !state.target.paused ? (
                <Box />
            ) : (
                <Stack
                    callFrames={state.target.callFrames}
                    scripts={state.target.scripts}
                    interactive={true}
                    focusedCallFrame={state.target.focusedCallFrame}
                />
            )}
        </Box>
    );
}
