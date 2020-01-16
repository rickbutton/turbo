import React from "react";
import {
    InputEvent,
    BufferTarget,
    BufferTargetContext,
    MouseEvent,
} from "./buffertarget";
// eslint-disable-next-line @typescript-eslint/camelcase
import { unstable_batchedUpdates } from "./renderer";

export function useBufferTarget(): BufferTarget {
    return React.useContext(BufferTargetContext);
}

interface TerminalSize {
    width: number;
    height: number;
}
export function useTerminalSize(): TerminalSize {
    const target = useBufferTarget();

    const [width, setWidth] = React.useState(0);
    const [height, setHeight] = React.useState(0);

    React.useEffect(() => {
        setWidth(target.width);
        setHeight(target.height || 0);
    }, [target.width, target.height]);

    return { width, height };
}

export function useInput(cb: (event: InputEvent) => void): void {
    const target = useBufferTarget();

    React.useEffect(() => {
        const handler = (event: InputEvent): void => {
            unstable_batchedUpdates(() => {
                cb(event);
            });
        };
        target.on("input", handler);
        return (): void => target.off("input", handler);
    });
}
export function useMouse(cb: (event: MouseEvent) => void): void {
    const target = useBufferTarget();

    React.useEffect(() => {
        const handler = (event: MouseEvent): void => {
            unstable_batchedUpdates(() => {
                cb(event);
            });
        };
        target.on("mouse", handler);
        return (): void => target.off("mouse", handler);
    });
}

export function useInterval(callback: () => void, delay: number): void {
    const savedCallback = React.useRef<() => void>();

    React.useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    React.useEffect(() => {
        const handler = (): void =>
            unstable_batchedUpdates(() => {
                savedCallback.current && savedCallback.current();
            });
        const id = setInterval(handler, delay);
        return (): void => clearInterval(id);
    }, [delay]);
}
