import { Server } from "@turbo/net";
import {
    Turbo,
    createLogger,
    State,
    TargetConnection,
    Action,
    StateReducer,
} from "@turbo/core";
import { getCurrentSessionId } from "@turbo/tmux";

const logger = createLogger("daemon");

export function daemon(turbo: Turbo): void {
    const sessionId = getCurrentSessionId(turbo.env);
    const reducer = new StateReducer({
        targets: {},
    });

    function currentConnection(): TargetConnection | null {
        const keys = Object.keys(reducer.state.targets);
        const target = reducer.state.targets[keys[0]];
        if (target) {
            return target.connected ? target.connection : null;
        } else {
            return null;
        }
    }

    if (!sessionId) {
        logger.error("unable to identify current session");
        return;
    }

    const server = new Server(sessionId, { currentConnection });
    server.on("connected", conn => {
        conn.broadcast(reducer.state);
    });
    server.on("disconnected", _ => {});

    server.on("action", (action: Action) => {
        reducer.action(action);
    });

    reducer.on("update", (state: State) => {
        server.broadcast(state);
    });

    server.start();
}
