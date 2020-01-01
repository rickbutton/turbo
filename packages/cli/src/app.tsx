import React from "react";
import { Box, render } from "./renderer";
import { Code } from "./components/code";
import { Repl } from "./components/repl";
import { TurboContext } from "./context";
import { TurboContextContext } from "./components/helpers";

interface AppProps {
    context: TurboContext;
}
function App(props: AppProps): JSX.Element {
    return (
        <TurboContextContext.Provider value={props.context}>
            <Box height="50%">
                <Code />
            </Box>
            <Box height="50%">
                <Repl />
            </Box>
        </TurboContextContext.Provider>
    );
}

export function renderApp(props: AppProps): void {
    render(<App {...props} />);
}
