import { Server } from "@turbo/net";
import { Turbo, createLogger, State, reduce } from "@turbo/core";
import { getCurrentSessionId } from "@turbo/tmux";

const logger = createLogger("daemon");

let state: State = {
    counter: 0,
    value: 0,
};

export function daemon(turbo: Turbo): void {
    const sessionId = getCurrentSessionId(turbo.env);
    if (sessionId) {
        const server = new Server(sessionId);

        server.on("data", event => {
            state = reduce(state, event.data);
            server.broadcast(state);
        });

        server.on("connected", event => {
            event.client.broadcast(state);
        });
        server.on("disconnected", _ => {});

        server.start();
    } else {
        logger.error("unable to identify current session");
    }
}
