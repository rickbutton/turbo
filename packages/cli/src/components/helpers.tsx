import { Client } from "@turbo/net";
import {
    logger,
    State,
    RemoteObjectProperty,
    ObjectId,
    RemoteException,
    ScriptId,
    CallFrame,
    Turbo,
} from "@turbo/core";
import React from "react";
import { highlight } from "cli-highlight";

export const TurboContext = React.createContext<Turbo>(
    (null as unknown) as Turbo,
);
export function useTurbo(): Turbo {
    return React.useContext(TurboContext);
}

export const ClientContext = React.createContext<Client>(
    (null as unknown) as Client,
);
export function useClient(): Client {
    return React.useContext(ClientContext);
}

export function useClientState(): State | null {
    const client = useClient();
    const [state, setState] = React.useState<State | null>(null);

    React.useEffect(() => {
        const cb = (state: State): void => {
            setState(state);
        };
        client.on("sync", cb);

        return (): void => client.off("sync", cb);
    }, [client]);

    return state;
}

export function useScriptSource(id: ScriptId | undefined): string {
    const client = useClient();
    const state = useClientState();
    const [script, setScript] = React.useState("");

    React.useEffect(() => {
        if (!id) {
            setScript("");
        } else if (!state) {
            setScript("");
        } else if (state.target.paused) {
            client.getScriptSource(id).then(({ value }) => {
                setScript(value);
            });
        } else {
            setScript("");
        }
    }, [Boolean(state), state ? state.target.paused : false, id]);

    return script;
}

export function useFocusedCallFrame(): CallFrame | undefined {
    const state = useClientState();
    if (state && state.target.paused) {
        return state.target.callFrames[state.target.focusedCallFrame];
    } else {
        return undefined;
    }
}

export function useObjectProperties(
    objectId: ObjectId,
): [boolean, RemoteObjectProperty[] | null, RemoteException | string | null] {
    const client = useClient();
    const [loaded, setLoaded] = React.useState(false);
    const [props, setProps] = React.useState<RemoteObjectProperty[] | null>(
        null,
    );
    const [error, setError] = React.useState<RemoteException | string | null>(
        null,
    );

    React.useEffect(() => {
        client.getProperties(objectId).then(resp => {
            setLoaded(true);
            if (resp.error) {
                setProps(null);
                setError(resp.value);
            } else {
                setProps(resp.value);
                setError(null);
            }
        });
    }, [objectId]);

    return [loaded, props, error];
}

export function highlightJs(str: string): string {
    return highlight(str, { language: "javascript" });
}
