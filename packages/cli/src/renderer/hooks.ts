import React from "react";
import { InputEvent, BufferTarget, BufferTargetContext } from "./buffertarget";
// eslint-disable-next-line @typescript-eslint/camelcase
import { unstable_batchedUpdates } from "./renderer";

export function useBufferTarget(): BufferTarget {
    return React.useContext(BufferTargetContext);
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

export function useInterval(callback: () => void, delay: number): void {
    const savedCallback = React.useRef<() => void>();

    React.useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    React.useEffect(() => {
        const handler = (): void =>
            savedCallback.current && savedCallback.current();
        const id = setInterval(handler, delay);
        return (): void => clearInterval(id);
    }, [delay]);
}
