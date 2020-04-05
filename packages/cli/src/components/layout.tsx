import React from "react";
import { Box } from "../renderer";
import { Code } from "./code";
import { Repl } from "./repl";
import { ScopesComponent } from "./scope";
import { StackComponent } from "./stack";
import { BreakpointsComponent } from "./breakpoints";
import { Tabs, Tab } from "./tabs";

export function Layout(): JSX.Element {
    return (
        <Box grow={1}>
            <Tabs>
                <Tab name="debug" title="debug">
                    <Box grow={1}>
                        <Box direction="column" grow={3} basis={1}>
                            <Box grow={3} basis={1}>
                                <Code />
                            </Box>
                            <Box grow={1} basis={1}>
                                <Repl />
                            </Box>
                        </Box>
                        <Box direction="column" grow={2} basis={1}>
                            <Box grow={3} basis={1} direction="column">
                                <Box grow={2} basis={1}>
                                    <ScopesComponent />
                                </Box>
                                <Box grow={2} basis={1}>
                                    <StackComponent />
                                </Box>
                            </Box>
                            <Box grow={1} basis={1}>
                                <BreakpointsComponent />
                            </Box>
                        </Box>
                    </Box>
                </Tab>
                <Tab name="logs" title="logs">
                    foo bar
                </Tab>
            </Tabs>
        </Box>
    );
}
