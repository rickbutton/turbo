import { Client } from "@turbo/net";
import {
    logger,
    State,
    RemoteObjectProperty,
    ObjectId,
    RemoteException,
} from "@turbo/core";
import React from "react";
import { highlight } from "cli-highlight";

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

export function useScriptSource(): string {
    const client = useClient();
    const state = useClientState();
    const [script, setScript] = React.useState("");

    React.useEffect(() => {
        if (!state) {
            setScript("");
        } else if (state.target.paused) {
            const topCallFrame = state.target.callFrames[0];
            client
                .getScriptSource(topCallFrame.location.scriptId)
                .then(({ value }) => {
                    setScript(value);
                });
        } else {
            setScript("");
        }
    }, [state]);

    return script;
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
