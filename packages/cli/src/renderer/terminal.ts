import {
    BufferTarget,
    BufferTargetEvents,
    KeyName,
    SPECIAL_KEYS,
    MouseButton,
    MouseEvent,
} from "./buffertarget";
import { terminal, ScreenBuffer } from "terminal-kit";
import { EmitterBase } from "@turbo/core";
// eslint-disable-next-line @typescript-eslint/camelcase
import { unstable_batchedUpdates } from "./renderer";

export type TerminalMouseEventType =
    | "MOUSE_LEFT_BUTTON_PRESSED"
    | "MOUSE_LEFT_BUTTON_RELEASED"
    | "MOUSE_RIGHT_BUTTON_PRESSED"
    | "MOUSE_RIGHT_BUTTON_RELEASED"
    | "MOUSE_MIDDLE_BUTTON_PRESSED"
    | "MOUSE_MIDDLE_BUTTON_RELEASED"
    | "MOUSE_WHEEL_UP"
    | "MOUSE_WHEEL_DOWN"
    | "MOUSE_OTHER_BUTTON_PRESSED"
    | "MOUSE_OTHER_BUTTON_RELEASED"
    | "MOUSE_BUTTON_RELEASED";

export interface TerminalMouseEvent {
    x: number;
    y: number;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
}

function normalizeMouseEvent(
    type: TerminalMouseEventType,
    event: TerminalMouseEvent,
): MouseEvent {
    let pressed = false;
    let button: MouseButton = "left";
    switch (type) {
        case "MOUSE_LEFT_BUTTON_RELEASED":
            pressed = false;
            button = "left";
            break;
        case "MOUSE_LEFT_BUTTON_PRESSED":
            pressed = true;
            button = "left";
            break;
        case "MOUSE_RIGHT_BUTTON_RELEASED":
            pressed = false;
            button = "right";
            break;
        case "MOUSE_RIGHT_BUTTON_PRESSED":
            pressed = true;
            button = "right";
            break;
        case "MOUSE_MIDDLE_BUTTON_RELEASED":
            pressed = false;
            button = "middle";
            break;
        case "MOUSE_MIDDLE_BUTTON_PRESSED":
            pressed = true;
            button = "middle";
            break;
        case "MOUSE_OTHER_BUTTON_RELEASED":
            pressed = false;
            button = "other";
            break;
        case "MOUSE_OTHER_BUTTON_PRESSED":
            pressed = true;
            button = "other";
            break;
        case "MOUSE_WHEEL_UP":
            pressed = false;
            button = "wheel-up";
            break;
        case "MOUSE_WHEEL_DOWN":
            pressed = false;
            button = "wheel-down";
            break;
    }

    return {
        x: event.x,
        y: event.y,
        pressed,
        button,
    };
}

function normalizeName(
    name: string,
    matches: string[],
): { key: KeyName; ctrl: boolean; alt: boolean; shift: boolean } {
    function stripMods(str: string): string {
        return str
            .replace(/CTRL_/g, "")
            .replace(/ALT_/g, "")
            .replace(/SHIFT_/g, "");
    }
    function getMods(
        str: string,
    ): { ctrl: boolean; alt: boolean; shift: boolean } {
        return {
            ctrl: str.includes("CTRL_"),
            alt: str.includes("ALT_"),
            shift: str.includes("SHIFT_"),
        };
    }

    const cleanName = stripMods(name);
    if (SPECIAL_KEYS.includes(cleanName as KeyName)) {
        const { ctrl, alt, shift } = getMods(name);
        return {
            key: cleanName as KeyName,
            ctrl,
            alt,
            shift,
        };
    }

    for (const match of matches) {
        const cleanMatch = stripMods(match);
        if (SPECIAL_KEYS.includes(cleanMatch as KeyName)) {
            const { ctrl, alt, shift } = getMods(match);
            return {
                key: cleanMatch as KeyName,
                ctrl,
                alt,
                shift,
            };
        }
    }

    const { ctrl, alt, shift } = getMods(name);
    return {
        key: cleanName as KeyName,
        ctrl,
        alt,
        shift,
    };
}

let didSetup = false;
class TerminalBufferTarget extends EmitterBase<BufferTargetEvents> {
    private readonly buffer = new ScreenBuffer({
        dst: terminal,
    });
    private cursorX = 0;
    private cursorY = 0;

    get width(): number {
        return terminal.width;
    }
    get height(): number {
        return terminal.height;
    }
    public setup(): void {
        if (didSetup) {
            throw new Error(
                "attempted to setup multiple terminal buffer targets",
            );
        }

        didSetup = true;
        terminal.grabInput({ mouse: "button" });

        process.stdin.on("data", data => {
            const str = data.toString();
            if (str === "\x03") {
                process.exit(0);
            }
        });

        terminal.on("resize", (width: number, height: number) => {
            this.fire("resize", { width, height });
        });
        terminal.on(
            "mouse",
            (type: TerminalMouseEventType, data: TerminalMouseEvent) => {
                unstable_batchedUpdates(() => {
                    this.fire("mouse", normalizeMouseEvent(type, data));
                });
            },
        );
        terminal.on("key", (name: string, matches: string[], data: any) => {
            unstable_batchedUpdates(() => {
                const { key, ctrl, alt, shift } = normalizeName(name, matches);
                if (data.isCharacter) {
                    this.fire("input", {
                        isChar: true,
                        name: key,
                        ctrl,
                        alt,
                        shift,
                        char: key,
                        codepoint: data.codepoint || 0,
                    });
                } else {
                    this.fire("input", {
                        isChar: false,
                        name: key,
                        ctrl,
                        alt,
                        shift,
                    });
                }
            });
        });
    }

    draw(
        vertical: boolean,
        x: number,
        y: number,
        regionX: number,
        regionY: number,
        regionWidth: number,
        regionHeight: number,
        str: string,
    ): void {
        const dx = vertical ? 0 : 1;
        const dy = vertical ? 1 : 0;

        let targetX = x;
        let targetY = y;
        for (const c of str) {
            const regionXMin = regionX;
            const regionXMax = regionX + regionWidth;
            const regionYMin = regionY;
            const regionYMax = regionY + regionHeight;

            if (
                targetX >= regionXMin &&
                targetX <= regionXMax &&
                targetY >= regionYMin &&
                targetY <= regionYMax
            ) {
                this.buffer.put(
                    {
                        dx: 0,
                        dy: 0,
                        x: targetX,
                        y: targetY,
                        attr: {},
                        wrap: false,
                    },
                    c,
                );
            }
            targetX += dx;
            targetY += dy;
        }
    }
    setCursor(x: number, y: number): void {
        this.cursorX = x;
        this.cursorY = y;
    }
    clear(): void {
        this.buffer.fill({
            attr: {
                bgDefaultColor: true,
            },
        });
    }
    flush(delta: boolean): void {
        this.buffer.draw({ delta });
        this.buffer.moveTo(this.cursorX, this.cursorY);
        this.buffer.drawCursor();
    }
}

export const Terminal: BufferTarget = new TerminalBufferTarget();
