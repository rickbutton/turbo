import { Server } from "@jug/net";
import { Jug, createLogger, State, reduce } from "@jug/core";
import { getCurrentSessionId } from "@jug/tmux";

const logger = createLogger("daemon");

let state: State = {
    counter: 0,
    value: 0,
};

export function daemon(jug: Jug): void {
    const sessionId = getCurrentSessionId(jug.env);
    if (sessionId) {
        const server = new Server(sessionId);

        server.on("data", event => {
            state = reduce(state, event.data);
            server.broadcast(state);
        });

        server.on("connected", event => {
            event.client.send(state);
        });
        server.on("disconnected", _ => {});

        server.start();
    } else {
        logger.error("unable to identify current session");
    }
}
