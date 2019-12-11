import { Jug, createLogger, State } from "@jug/core";
import { Client } from "@jug/net";
import { getCurrentSessionId } from "@jug/tmux";

export function component(jug: Jug, name: string): void {
    const logger = createLogger(`component:${name}`);

    const sessionId = getCurrentSessionId(jug.env);
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
