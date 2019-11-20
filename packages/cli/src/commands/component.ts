import { Jug, createLogger } from "@jug/core";
import { Client } from "@jug/client";
import { getCurrentSessionId } from "@jug/tmux";

export function component(jug: Jug, name: string): void {
    const logger = createLogger(`component:${name}`);

    const sessionId = getCurrentSessionId(jug.env);
    if (sessionId) {
        const client = new Client(sessionId);

        client.on("error", () => {});
        client.on("ready", () => {
            logger.debug("client ready");
        });

        client.connect();
    } else {
        logger.error("unable to identify current session");
    }
}
