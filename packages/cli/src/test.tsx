import React from "react";
import { render, Box, Terminal, Input } from "./renderer";

function Test(): JSX.Element {
    const [counter, setCounter] = React.useState(1);

    function inc(): void {
        setCounter(counter + 1);
    }

    return (
        <Box grow={1} direction="column">
            <Box grow={1}>
                <Box justify="center" alignItems="center" grow={1}>
                    counter: {counter}
                </Box>
                <Box
                    justify="center"
                    alignItems="center"
                    grow={1}
                    onClick={inc}
                >
                    click to increment
                </Box>
            </Box>
            <Input />
        </Box>
    );
}

render(<Test />, Terminal);
