import { logger, LOGO, Breakpoint } from "@turbo/core";
import React from "react";
import { Box, ScrollableBox } from "../renderer";
import {
    useClientState,
    highlightJs,
    useFocusedCallFrame,
    useScriptSource,
    useClient,
    useTurbo,
} from "./helpers";
import { setBreakpoint, removeBreakpoint } from "./actions";

interface NumbersProps {
    height: number;
    onClick?(line: number): void;
}

function Numbers(props: NumbersProps): JSX.Element {
    const width = String(props.height).length;
    const onClick = props.onClick || ((): void => undefined);
    const elements: JSX.Element[] = [];

    for (let i = 0; i < props.height; i++) {
        elements.push(
            <Box key={i} onClick={onClick.bind(null, i)}>
                {String(i + 1).padStart(width, " ")}
            </Box>,
        );
    }
    return <Box direction="column">{elements}</Box>;
}

interface GutterProps {
    height: number;
    onClick?(line: number): void;
}
function Gutter(props: GutterProps): JSX.Element {
    const state = useClientState();
    const callFrame = useFocusedCallFrame();

    if (!state) return <Box />;

    const onClick = props.onClick || ((): void => undefined);
    const breakpoints = state.target.breakpoints;

    const breakpointsByLine = breakpoints.reduce((map, breakpoint) => {
        map[breakpoint.line] = breakpoint;
        return map;
    }, {} as { [key: number]: Breakpoint });

    const elements: JSX.Element[] = [];
    for (let i = 0; i < props.height; i++) {
        if (callFrame && i === callFrame.location.line) {
            elements.push(
                <Box
                    key={i}
                    height={1}
                    width={2}
                    color="red"
                    onClick={onClick.bind(null, i)}
                >
                    {" >"}
                </Box>,
            );
        } else if (breakpointsByLine[i]) {
            elements.push(
                <Box
                    key={i}
                    height={1}
                    width={2}
                    color="red"
                    onClick={onClick.bind(null, i)}
                >
                    {" O"}
                </Box>,
            );
        } else {
            elements.push(
                <Box
                    key={i}
                    height={1}
                    width={2}
                    onClick={onClick.bind(null, i)}
                >
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
    const turbo = useTurbo();
    const client = useClient();
    const state = useClientState();
    const callFrame = useFocusedCallFrame();
    const script =
        state && callFrame
            ? state.target.scripts.find(
                  s => s.id === callFrame.location.scriptId,
              )
            : null;
    const source = useScriptSource(
        callFrame ? callFrame.location.scriptId : undefined,
    );
    const lines = React.useMemo(() => highlightJs(source).split("\n"), [
        source,
    ]);

    function onGutterClick(line: number): void {
        if (!state || !script) return;

        const matches = state.target.breakpoints.filter(b => b.line === line);

        if (matches.length > 0) {
            for (const match of matches) {
                client.dispatch(removeBreakpoint(match.id));
            }
        } else {
            client.dispatch(setBreakpoint(script, line));
        }
    }

    let content: JSX.Element;
    if (!state) {
        content = (
            <LogoText>
                <Box wrap={true}>
                    The component has not synced with the daemon.
                </Box>
            </LogoText>
        );
    } else if (state.target.paused && callFrame) {
        const height = lines.length;
        const loc = callFrame.location;
        content = (
            <ScrollableBox grow={1} direction="row" desiredFocus={loc.line}>
                <Numbers height={height} onClick={onGutterClick} />
                <Gutter height={height} onClick={onGutterClick} />
                <Box direction="column" grow={1}>
                    {lines}
                </Box>
            </ScrollableBox>
        );
    } else if (state.target.connected) {
        content = (
            <LogoText>
                <Box wrap={true}>The target is not paused.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can pause the target with the &quot;pause&quot; or
                    &quot;p&quot; commands in the repl.
                </Box>
            </LogoText>
        );
    } else {
        content = (
            <LogoText>
                <Box wrap={true}>The target is not running.</Box>
                <Box wrap={true} marginTop={1} color={"gray"}>
                    Hint: You can restart the target with the &quot;start&quot;
                    or &quot;restart&quot; commands in the repl.
                </Box>
            </LogoText>
        );
    }

    let title = "";
    if (script) {
        title = turbo.env.cleanPath(script.url);
    }

    return (
        <Box direction="column">
            <Box bg={"brightWhite"} color={"black"}>
                {title}
            </Box>
            {content}
        </Box>
    );
}
