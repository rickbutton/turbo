import { Turbo, createLogger } from "@turbo/core";
import { Client } from "@turbo/net";
import { getCurrentSessionId } from "@turbo/tmux";
import React from "react";
import { render } from "ink";

import { Repl } from "../components/repl";
import { Code } from "../components/code";

const logger = createLogger("component");

interface ComponentProps {
    client: Client;
}
type Component = (props: ComponentProps) => JSX.Element;

const components: { [key: string]: Component } = {
    repl: Repl,
    code: Code,
};

export function component(turbo: Turbo, name: string): void {
    const sessionId = getCurrentSessionId(turbo.env);
    const Component = components[name];

    if (!Component) {
        logger.error(`unknown component: ${name}`);
        return;
    }
    if (!sessionId) {
        logger.error("unable to identify current session");
        return;
    }

    const client = new Client({ type: "managed", sessionId });

    client.on("ready", () => {
        render(<Component client={client} />);
    });

    client.connectAfterDelay();
}
