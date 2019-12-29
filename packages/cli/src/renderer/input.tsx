import React from "react";
import { useInput } from "./hooks";
import { Box } from "./box";
import { Cursor } from "./cursor";

interface InputProps {
    onSubmit?(input: string): void;
}
export function Input(props: InputProps): JSX.Element {
    const [before, setBefore] = React.useState("");
    const [after, setAfter] = React.useState("");

    function moveLeft(): void {
        if (before.length > 0) {
            const c = before[before.length - 1];
            setBefore(before.substring(0, before.length - 1));
            setAfter(c + after);
        }
    }
    function moveRight(): void {
        if (after.length > 0) {
            const c = after[0];
            setBefore(before + c);
            setAfter(after.substring(1));
        }
    }

    useInput(event => {
        if (event.name === "LEFT") {
            moveLeft();
        } else if (event.name === "RIGHT") {
            moveRight();
        } else if (event.name === "BACKSPACE") {
            setBefore(before.substring(0, before.length - 1));
        } else if (event.name === "DELETE") {
            setAfter(after.substring(1));
        } else if (event.name === "ENTER") {
            if (props.onSubmit) {
                props.onSubmit(before + after);
            }
            setBefore("");
            setAfter("");
        } else if (event.isChar) {
            setBefore(before + event.char);
        }
    });

    return (
        <Box grow={1}>
            {before}
            <Cursor />
            {after}
        </Box>
    );
}
