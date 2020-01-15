import {
    BufferTargetEvents,
    KeyName,
    SPECIAL_KEYS,
    MouseButton,
    MouseEvent,
    BufferTargetMode,
    DrawAttribute,
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

interface CursorLocation {
    x: number;
    y: number;
}

export class TerminalBufferTarget extends EmitterBase<BufferTargetEvents> {
    private readonly buffer = new ScreenBuffer({
        dst: terminal,
    });
    private cursor: CursorLocation | null = null;
    private mode: BufferTargetMode;

    public width = 0;
    public height: number | undefined = 0;

    public constructor(mode: BufferTargetMode) {
        super();
        this.mode = mode;
    }

    public setup(): void {
        if (this.mode === "fullscreen") {
            this.width = terminal.width;
            this.height = terminal.height;

            process.stdin.on("data", data => {
                const str = data.toString();
                if (str === "\x03") {
                    process.exit(0);
                }
            });

            terminal.grabInput({ mouse: "button" });

            terminal.on("resize", (width: number, height: number) => {
                this.width = width;
                this.height = height;
                this.buffer.resize({
                    xmin: 0,
                    xmax: width,
                    ymin: 0,
                    ymax: height,
                });
                terminal.clear();
                this.fire("resize", undefined);
            });
        } else {
            this.width = terminal.width;
            this.height = undefined;
        }

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

    fillBg(
        xmin: number,
        xmax: number,
        ymin: number,
        ymax: number,
        color: string | number | undefined,
    ): void {
        this.buffer.fill({
            attr: {
                bgColor: color,
            },
            region: {
                xmin,
                xmax,
                ymin,
                ymax,
            },
        } as any);
    }

    draw(
        x: number,
        y: number,
        xmin: number,
        xmax: number,
        ymin: number,
        ymax: number,
        attr: DrawAttribute,
        str: string,
    ): void {
        const dx = 1;
        const dy = 0;

        let targetX = x;
        let targetY = y;
        for (const c of str) {
            if (
                targetX >= xmin &&
                targetX <= xmax &&
                targetY >= ymin &&
                targetY <= ymax
            ) {
                this.buffer.put(
                    {
                        dx: 0,
                        dy: 0,
                        x: targetX,
                        y: targetY,
                        attr: attr as any,
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
        this.cursor = { x, y };
    }
    clearCursor(): void {
        this.cursor = null;
    }
    prepare(width: number, height: number): void {
        if (this.width !== width || this.height !== height) {
            this.buffer.resize({ width, height, x: 0, y: 0 });
        }
        this.buffer.fill({
            attr: {
                bgDefaultColor: true,
            },
        });
    }
    flush(delta: boolean): void {
        if (this.mode === "fullscreen") {
            this.buffer.draw({ delta });

            if (this.cursor) {
                terminal.hideCursor(false as any);
                this.buffer.moveTo(this.cursor.x, this.cursor.y);
                this.buffer.drawCursor();
            } else {
                terminal.hideCursor();
                this.buffer.drawCursor();
            }
        } else {
            const output = this.buffer.dumpChars();
            process.stdout.write(output);
        }
    }
}
