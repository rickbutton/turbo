import { Turbo, logger } from "@turbo/core";
import { Client } from "@turbo/net";
import { getCurrentSessionId } from "@turbo/tmux";
import React from "react";
import { render } from "../renderer";
import { log } from "../components/log";
import { Repl } from "../components/repl";
import { Code } from "../components/code";
import { ClientContext } from "../components/helpers";

interface StandardComponent {
    type: "standard";
    value: (client: Client) => void;
}
interface ReactComponent {
    type: "react";
    value: () => JSX.Element;
}
type Component = StandardComponent | ReactComponent;

const components: { [key: string]: Component } = {
    log: { type: "standard", value: log.bind(null, "target") },
    debug: { type: "standard", value: log.bind(null, "turbo") },
    repl: { type: "react", value: Repl },
    code: { type: "react", value: Code },
};

interface AppProps {
    client: Client;
}
function App(props: React.PropsWithChildren<AppProps>): JSX.Element {
    return (
        <ClientContext.Provider value={props.client}>
            {props.children}
        </ClientContext.Provider>
    );
}

export function component(turbo: Turbo, name: string): void {
    const sessionId = getCurrentSessionId(turbo);
    const Component = components[name];

    if (!Component) {
        console.error(`unknown component: ${name}`);
        return;
    }
    if (!sessionId) {
        console.error("unable to identify current session");
        return;
    }
    const client = new Client(turbo, { type: "managed", sessionId });

    client.on("ready", () => {
        if (Component.type === "react") {
            render(
                <App client={client}>
                    <Component.value />
                </App>,
            );
        } else {
            Component.value(client);
        }
    });

    client.connectAfterDelay();
}
