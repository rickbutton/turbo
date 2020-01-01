import { State } from "@turbo/core";
import React from "react";
import { TurboContext } from "../context";

export const TurboContextContext = React.createContext<TurboContext>(
    (null as unknown) as TurboContext,
);
export function useTurboContext(): TurboContext {
    return React.useContext(TurboContextContext);
}

export function useTurboState(): State {
    const context = useTurboContext();
    const [state, setState] = React.useState(context.state);

    React.useEffect(() => {
        function listen(newState: State): void {
            setState(newState);
        }
        context.on("state", listen);
        return (): void => context.off("state", listen);
    });

    return state;
}

export function useScriptSource(): string {
    const context = useTurboContext();
    const state = useTurboState();
    const [script, setScript] = React.useState("");

    React.useEffect(() => {
        if (!state) {
            setScript("");
        } else if (state.target.runtime.paused) {
            const topCallFrame = state.target.runtime.callFrames[0];
            context
                .getScriptSource(topCallFrame.location.scriptId)
                .then(script => {
                    setScript(script);
                });
        } else {
            setScript("");
        }
    }, [state]);

    return script;
}
