import React from "react";
import {
    InputEvent,
    BufferTarget,
    BufferTargetContext,
    MouseEvent,
} from "./buffertarget";
// eslint-disable-next-line @typescript-eslint/camelcase
import { unstable_batchedUpdates } from "./renderer";
// eslint-disable-next-line @typescript-eslint/camelcase
import { unstable_calculateTextHeight } from ".";

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

export function useOnHeightChanged(
    ref: React.RefObject<any>,
    width: number,
): number {
    const [height, setHeight] = React.useState(0);

    function onNodeDrawn(): void {
        const newHeight = unstable_calculateTextHeight(ref.current, width);

        if (height !== newHeight) {
            setHeight(newHeight);
        }
    }
    const debouncedOnNodeDrawn = useDebouncedCallback(onNodeDrawn, 10);

    React.useEffect(() => {
        if (ref.current) {
            // eslint-disable-next-line @typescript-eslint/camelcase
            ref.current.unstable_onNodeDrawn = debouncedOnNodeDrawn;
        }
        return (): void => {
            if (ref.current) {
                // eslint-disable-next-line @typescript-eslint/camelcase
                ref.current.unstable_onNodeDrawn = undefined;
            }
        };
    }, [ref.current]);

    return height;
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

export function useDebouncedCallback(
    callback: () => void,
    wait: number,
): () => void {
    // track timeout handle between calls
    const timeout = React.useRef<ReturnType<typeof setTimeout>>();

    function cleanup(): void {
        if (timeout.current) {
            clearTimeout(timeout.current);
        }
    }

    // make sure our timeout gets cleared if
    // our consuming component gets unmounted
    React.useEffect(() => cleanup, []);

    return function debouncedCallback(): void {
        // clear debounce timer
        cleanup();

        // start waiting again
        timeout.current = setTimeout(() => {
            callback();
        }, wait);
    };
}
