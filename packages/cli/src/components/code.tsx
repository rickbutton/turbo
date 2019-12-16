import { Client } from "@turbo/net";
import { highlight } from "cli-highlight";
import { createLogger } from "@turbo/core";
import React from "react";
import { useClientState, useScriptSource } from "./helpers";

const logger = createLogger("code");

interface Props {
    client: Client;
}

export function Code(props: Props): JSX.Element {
    const state = useClientState(props.client);
    const script = useScriptSource(props.client, state);

    if (!state) {
        return <span>no state</span>;
    } else if (state.target.runtime.paused) {
        return <span>{highlight(script, { language: "typescript" })}</span>;
    } else {
        return <span>not paused</span>;
    }
}
