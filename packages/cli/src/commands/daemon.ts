import { Server, ServerConnection, Request, ResponsePayload } from "@turbo/net";
import {
    Turbo,
    createLogger,
    State,
    Action,
    StateReducer,
    TargetConnection,
} from "@turbo/core";
import { getCurrentSessionId } from "@turbo/tmux";
import { connect } from "../v8";

const logger = createLogger("daemon");

export function daemon(turbo: Turbo): void {
    const sessionId = getCurrentSessionId(turbo.env);
    const reducer = new StateReducer({
        target: {
            connected: false,
        },
    });

    let serverConn: ServerConnection | null = null;
    let targetConn: TargetConnection | null = null;
    function handleTargetDisconnect(): void {
        if (serverConn) {
            logger.info("target unregistered");
            serverConn.off("close", handleTargetDisconnect);
            serverConn = null;
        }
    }

    async function registerTarget(
        conn: ServerConnection,
        _: Request<"registerTarget">,
    ): Promise<ResponsePayload<"registerTarget">> {
        if (serverConn) {
            const error = "A target is already connected to the daemon.";
            logger.error(error);
            return { error };
        } else {
            logger.info("target registered");
            serverConn = conn;
            serverConn.on("close", handleTargetDisconnect);
            return {};
        }
    }
    async function updateTarget(
        conn: ServerConnection,
        req: Request<"updateTarget">,
    ): Promise<ResponsePayload<"updateTarget">> {
        if (conn !== serverConn) {
            const error =
                "updateTarget: Not the connection for the current target";
            logger.error(error);
            return { error };
        } else {
            const iface = req.payload;
            // TODO: disconnect target v8 if needed
            targetConn = null;
            if (iface) {
                logger.info(
                    `target updated host:${iface.host} port:${iface.port}`,
                );
                try {
                    const target = await connect(iface.host, iface.port);
                    targetConn = target;
                    logger.info("target connnected");
                    return {};
                } catch (error) {
                    logger.info(
                        `target failed to connect: ${error.toString()}`,
                    );
                    targetConn = null;
                    return { error: error.toString() };
                }
            } else {
                logger.info("target disconnected");
                return {};
            }
        }
    }
    async function evaluate(
        _: ServerConnection,
        req: Request<"eval">,
    ): Promise<ResponsePayload<"eval">> {
        if (targetConn) {
            return {
                value: await targetConn.eval(req.payload.value),
            };
        } else {
            return { value: "Unable to evaluate, is the target connected?" };
        }
    }

    if (!sessionId) {
        logger.error("unable to identify current session");
        return;
    }
    const server = new Server(sessionId, {
        registerTarget,
        updateTarget,
        eval: evaluate,
    });

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
