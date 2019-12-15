import { Turbo, createLogger, Logger, State } from "@turbo/core";
import { Client } from "@turbo/net";
import { getCurrentSessionId } from "@turbo/tmux";

import { repl } from "../components/repl";

type Component = (
    client: Client,
    logger: Logger,
    getState: () => State | null,
) => void;

export function component(turbo: Turbo, name: string): void {
    let state: State | null = null;

    const components: { [key: string]: Component } = { repl };

    const logger = createLogger(`component:${name}`);

    const sessionId = getCurrentSessionId(turbo.env);
    const component = components[name];

    if (!component) {
        logger.error(`unknown component: ${name}`);
        return;
    }
    if (!sessionId) {
        logger.error("unable to identify current session");
        return;
    }

    const client = new Client({ type: "managed", sessionId });

    client.on("ready", () => {
        component(client, logger, () => state);
    });
    client.on("sync", s => {
        state = s;
    });

    client.connectAfterDelay();
}
