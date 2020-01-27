import { logger, LOGO, Breakpoint } from "@turbo/core";
import React from "react";
import { Box, ScrollableBox } from "../renderer";
import {
    useClientState,
    highlightJs,
    useFocusedCallFrame,
    useScriptSource,
} from "./helpers";

interface NumbersProps {
    height: number;
}
function Numbers(props: NumbersProps): JSX.Element {
    const width = String(props.height).length;
    const elements: string[] = [];

    for (let i = 0; i < props.height; i++) {
        elements.push(String(i + 1).padStart(width, " "));
    }
    return <Box direction="column">{elements}</Box>;
}

interface GutterProps {
    height: number;
}
function Gutter(props: GutterProps): JSX.Element {
    const state = useClientState();
    const callFrame = useFocusedCallFrame();

    if (!state) return <Box />;

    const breakpoints = state.target.breakpoints;

    const breakpointsByLine = breakpoints.reduce((map, breakpoint) => {
        map[breakpoint.line] = breakpoint;
        return map;
    }, {} as { [key: number]: Breakpoint });

    const elements: JSX.Element[] = [];
    for (let i = 0; i < props.height; i++) {
        if (callFrame && i === callFrame.location.line) {
            elements.push(
                <Box key={i} height={1} width={2} color="red">
                    {" >"}
                </Box>,
            );
        } else if (breakpointsByLine[i]) {
            elements.push(
                <Box key={i} height={1} width={2} color="red">
                    {" O"}
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
    return <Box direction="column">{elements}</Box>;
}

function LogoText(props: React.PropsWithChildren<{}>): JSX.Element {
    return (
        <Box direction="column">
            <Box direction="column">{LOGO.split("\n")}</Box>
            {props.children}
        </Box>
    );
}

export function Code(): JSX.Element {
    const state = useClientState();
    const callFrame = useFocusedCallFrame();
    const script = useScriptSource(
        callFrame ? callFrame.location.scriptId : undefined,
    );
    const lines = React.useMemo(() => highlightJs(script).split("\n"), [
        script,
    ]);

    if (!state) {
        return (
            <LogoText>
                <Box wrap={true}>
                    The component has not synced with the daemon.
                </Box>
            </LogoText>
        );
    } else if (state.target.paused && callFrame) {
        const height = lines.length;
        const loc = callFrame.location;
        return (
            <ScrollableBox grow={1} direction="row" desiredFocus={loc.line}>
                <Numbers height={height} />
                <Gutter height={height} />
                <Box direction="column" grow={1}>
                    {lines}
                </Box>
            </ScrollableBox>
        );
    } else if (state.target.connected) {
        return (
            <LogoText>
                <Box wrap={true}>The target is not paused.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can pause the target with the &quot;pause&quot; or
                    &quot;p&quot; commands in the repl.
                </Box>
            </LogoText>
        );
    } else {
        return (
            <LogoText>
                <Box wrap={true}>The target is not running.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can restart the target with the &quot;start&quot;
                    or &quot;restart&quot; commands in the repl.
                </Box>
            </LogoText>
        );
    }
}
