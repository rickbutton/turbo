import React from "react";
import { useInput, Key } from "ink";
import chalk from "chalk";

const BACKSPACE = "\x08";
const DELETE = "\x7F";

interface InputProps {
    prompt: string;
    onSubmit: (value: string) => void;
}
export function Input(props: InputProps): JSX.Element {
    const { prompt, onSubmit } = props;
    const [value, setValue] = React.useState("");
    const [cursorOffset, setCursorOffset] = React.useState(value.length);

    useInput((i: string, key: Key): void => {
        if (key.upArrow || key.downArrow || (key.ctrl && i === "c")) return;

        if (key.return) {
            onSubmit(value);
            setValue("");
            setCursorOffset(0);
            return;
        }

        let offset = cursorOffset;
        let newValue = value;

        if (key.leftArrow) {
            offset--;
        } else if (key.rightArrow) {
            offset++;
        } else if (i === BACKSPACE || i === DELETE) {
            newValue = value.substring(0, offset - 1) + value.substring(offset);
            offset--;
        } else {
            newValue = value.substring(0, offset) + i + value.substring(offset);
            offset++;
        }

        if (offset < 0) offset = 0;
        if (offset > newValue.length) offset = newValue.length;

        setCursorOffset(offset);
        setValue(newValue);
    });

    let rendered = value;

    rendered = value.length > 0 ? "" : chalk.inverse(" ");

    let i = 0;
    for (const char of value) {
        if (i >= cursorOffset && i <= cursorOffset) {
            rendered += chalk.inverse(char);
        } else {
            rendered += char;
        }
        i++;
    }

    if (value.length > 0 && cursorOffset === value.length) {
        rendered += chalk.inverse(" ");
    }

    return <span>{chalk.blue(prompt) + rendered}</span>;
}
