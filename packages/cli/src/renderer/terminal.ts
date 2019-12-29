import {
    BufferTarget,
    BufferTargetEvents,
    MouseEvent,
    MouseEventType,
    KeyName,
    SPECIAL_KEYS,
} from "./buffertarget";
import { terminal, ScreenBuffer } from "terminal-kit";
import { EmitterBase } from "@turbo/core";
// eslint-disable-next-line @typescript-eslint/camelcase
import { unstable_batchedUpdates } from "./renderer";

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
        terminal.on("mouse", (type: MouseEventType, data: MouseEvent) => {
            unstable_batchedUpdates(() => {
                const { x, y, ctrl, alt, shift } = data;
                this.fire("mouse", {
                    type,
                    x,
                    y,
                    ctrl,
                    alt,
                    shift,
                });
            });
        });
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

    put(x: number, y: number, str: string): void {
        this.buffer.put(
            {
                x,
                y,
                dx: 1,
                dy: 0,
                attr: {},
                wrap: false,
            },
            str,
        );
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
