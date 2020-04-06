import { Turbo, logger, getCurrentSessionId } from "@turbo/core";
import { Client } from "@turbo/net";
import React from "react";
import { render } from "../renderer";
import { log } from "../components/log";
import { Repl } from "../components/repl";
import { Code } from "../components/code";
import { ClientContext, TurboContext } from "../components/helpers";
import { BreakpointsComponent } from "../components/breakpoints";
import { StackComponent } from "../components/stack";
import { ScopesComponent } from "../components/scope";

interface StandardComponent {
    type: "standard";
    value: (client: Client) => void;
}
interface EmptyReactProps {
    [key: string]: undefined;
}
interface ReactComponent {
    type: "react";
    value: (props: EmptyReactProps) => JSX.Element;
}
type Component = StandardComponent | ReactComponent;

const components: { [key: string]: Component } = {
    log: { type: "standard", value: log.bind(null, "target") },
    debug: { type: "standard", value: log.bind(null, "turbo") },
    repl: { type: "react", value: Repl },
    code: { type: "react", value: Code },
    breakpoints: { type: "react", value: BreakpointsComponent },
    stack: { type: "react", value: StackComponent },
    scopes: { type: "react", value: ScopesComponent },
};

interface AppProps {
    turbo: Turbo;
    client: Client;
}
function App(props: React.PropsWithChildren<AppProps>): JSX.Element {
    return (
        <TurboContext.Provider value={props.turbo}>
            <ClientContext.Provider value={props.client}>
                {props.children}
            </ClientContext.Provider>
        </TurboContext.Provider>
    );
}

export function renderComponent(turbo: Turbo, Component: Component): void {
    const sessionId = getCurrentSessionId(turbo);
    if (!sessionId) {
        console.error("unable to identify current session");
        return;
    }
    const client = new Client(turbo, { type: "managed", sessionId });

    client.on("ready", () => {
        if (Component.type === "react") {
            render(
                <App turbo={turbo} client={client}>
                    <Component.value />
                </App>,
            );
        } else {
            Component.value(client);
        }
    });
    client.on("quit", () => {
        turbo.env.exit();
    });

    client.connectAfterDelay();
}

export function component(turbo: Turbo, name: string): void {
    const Component = components[name];
    if (!Component) {
        console.error(`unknown component: ${name}`);
        return;
    }

    renderComponent(turbo, Component);
}
