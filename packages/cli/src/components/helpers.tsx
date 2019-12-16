import { Client } from "@turbo/net";
import { State } from "@turbo/core";
import React from "react";

export function useClientState(client: Client): State | null {
    const [state, setState] = React.useState<State | null>(null);

    React.useEffect(() => {
        const cb = (state: State): void => setState(state);
        client.on("sync", cb);

        return (): void => client.off("sync", cb);
    }, [client]);

    return state;
}

export function useScriptSource(client: Client, state: State | null): string {
    const [script, setScript] = React.useState("");

    React.useEffect(() => {
        if (!state) {
            setScript("");
        } else if (state.target.runtime.paused) {
            const topCallFrame = state.target.runtime.callFrames[0];
            client
                .getScriptSource(topCallFrame.location.scriptId)
                .then(({ script }) => {
                    setScript(script);
                });
        } else {
            setScript("");
        }
    }, [state]);

    return script;
}
