import React from "react";
import { Emitter } from "@turbo/core";

export type MouseButton =
    | "left"
    | "right"
    | "middle"
    | "wheel-up"
    | "wheel-down"
    | "other";
export interface MouseEvent {
    button: MouseButton;
    pressed: boolean;
    x: number;
    y: number;
}

export const SPECIAL_KEYS = [
    "ESCAPE",
    "ENTER",
    "BACKSPACE",
    "NUL",
    "TAB",
    "UP",
    "DOWN",
    "RIGHT",
    "LEFT",
    "INSERT",
    "DELETE",
    "HOME",
    "END",
    "PAGE_UP",
    "PAGE_DOWN",
    "KP_NUMLOCK",
    "KP_DIVIDE",
    "KP_MULTIPLY",
    "KP_MINUS",
    "KP_PLUS",
    "KP_DELETE",
    "KP_ENTER",
    "KP_0",
    "KP_1",
    "KP_2",
    "KP_3",
    "KP_4",
    "KP_5",
    "KP_6",
    "KP_7",
    "KP_8",
    "KP_9",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
] as const;

type OnlyNumberKeys<T> = T extends number ? T : never;
export type KeyName = typeof SPECIAL_KEYS[OnlyNumberKeys<
    keyof typeof SPECIAL_KEYS
>];

interface BaseInputEvent {
    name: KeyName;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
}
interface CharInputEvent extends BaseInputEvent {
    isChar: true;
    char: string;
    codepoint: number;
}
interface SpecialInputEvent extends BaseInputEvent {
    isChar: false;
}
export type InputEvent = CharInputEvent | SpecialInputEvent;

export interface BufferTargetEvents {
    resize: undefined;
    mouse: MouseEvent;
    input: InputEvent;
}
export type BufferTargetMode = "fullscreen" | "stdout";

export interface DrawAttribute {
    color?: string | number;
    defaultColor: boolean;
    bgColor?: string | number;
    bgDefaultColor: boolean;
    bold: boolean;
    dim: boolean;
    italic: boolean;
    underline: boolean;
    blink: boolean;
    inverse: boolean;
    strike: boolean;
}

export interface BufferTarget extends Emitter<BufferTargetEvents> {
    readonly width: number;
    readonly height: number | undefined;
    setup(): void;

    fillBg(
        xmin: number,
        xmax: number,
        ymin: number,
        ymax: number,
        color: string | number,
    ): void;
    draw(
        x: number,
        y: number,
        xmin: number,
        xmax: number,
        ymin: number,
        ymax: number,
        attr: DrawAttribute,
        str: string,
    ): void;
    setCursor(x: number, y: number): void;
    clearCursor(): void;
    prepare(width: number, height: number): void;
    flush(delta: boolean): void;
}

export const BufferTargetContext = React.createContext<BufferTarget>(
    (null as unknown) as BufferTarget,
);
