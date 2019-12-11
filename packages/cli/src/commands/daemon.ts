import { Server } from "@turbo/net";
import { Turbo, createLogger, State } from "@turbo/core";
import { getCurrentSessionId } from "@turbo/tmux";

const logger = createLogger("daemon");

const state: State = {
    counter: 0,
    value: 0,
};

export function daemon(turbo: Turbo): void {
    const sessionId = getCurrentSessionId(turbo.env);
    if (sessionId) {
        const server = new Server(sessionId);

        server.on("connected", event => {
            event.client.broadcast(state);
        });
        server.on("disconnected", _ => {});

        server.start();
    } else {
        logger.error("unable to identify current session");
    }
}
