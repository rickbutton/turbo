import { Turbo, createLogger, State } from "@turbo/core";
import { Client } from "@turbo/net";
import { getCurrentSessionId } from "@turbo/tmux";

export function component(turbo: Turbo, name: string): void {
    const logger = createLogger(`component:${name}`);

    const sessionId = getCurrentSessionId(turbo.env);
    if (sessionId) {
        const client = new Client({ sessionId });

        client.on("sync", (_: State) => {
            logger.debug("received sync message");
        });

        client.connect();
    } else {
        logger.error("unable to identify current session");
    }
}
