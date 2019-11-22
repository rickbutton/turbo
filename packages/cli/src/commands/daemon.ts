import { Daemon } from "@jug/daemon";
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
        const daemon = new Daemon(sessionId);

        daemon.on("data", event => {
            state = reduce(state, event.data);
            daemon.broadcast(state);
        });

        daemon.on("connected", event => {
            event.client.send(state);
        });
        daemon.on("disconnected", _ => {});

        daemon.start();
    } else {
        logger.error("unable to identify current session");
    }
}
