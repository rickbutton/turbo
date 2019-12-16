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
            runtime: { paused: false },
        },
    });

    let serverConn: ServerConnection | null = null;
    let targetConn: TargetConnection | null = null;
    function handleServerDisconnection(): void {
        if (serverConn) {
            logger.info("target unregistered");
            serverConn.off("close", handleServerDisconnection);
            serverConn = null;
        }
    }
    function handleTargetConnection(targetConn: TargetConnection): void {
        targetConn.on("paused", event => {
            reducer.action({ type: "paused", callFrames: event.callFrames });
        });
        targetConn.on("resumed", _ => {
            reducer.action({ type: "resumed" });
        });
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
            serverConn.on("close", handleServerDisconnection);
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
            if (iface) {
                logger.info(
                    `target updated host:${iface.host} port:${iface.port}`,
                );
                targetConn = null;
                try {
                    const target = await connect(iface.host, iface.port);
                    handleTargetConnection(target);
                    targetConn = target;
                    logger.info("target connnected");
                    reducer.action({ type: "target-connect" });
                } catch (error) {
                    logger.info(
                        `target failed to connect: ${error.toString()}`,
                    );
                    targetConn = null;
                }
            } else if (targetConn) {
                logger.info("target going to disconnect");
                try {
                    await targetConn.close();
                    logger.info("target disconnected");
                } finally {
                    reducer.action({ type: "target-disconnect" });
                    targetConn = null;
                }
            }
            return {};
        }
    }
    async function evaluate(
        _: ServerConnection,
        req: Request<"eval">,
    ): Promise<ResponsePayload<"eval">> {
        if (targetConn) {
            return {
                value: await targetConn.eval(req.payload.value, req.payload.id),
            };
        } else {
            return { value: "Unable to evaluate, is the target connected?" };
        }
    }
    async function pause(): Promise<ResponsePayload<"pause">> {
        logger.debug("received pause command");
        if (targetConn) {
            targetConn.pause();
        }
        return undefined;
    }
    async function resume(): Promise<ResponsePayload<"resume">> {
        logger.debug("received resume command");
        if (targetConn) {
            targetConn.resume();
        }
        return undefined;
    }
    async function stepInto(): Promise<ResponsePayload<"stepInto">> {
        logger.debug("received stepInto command");
        if (targetConn) {
            targetConn.stepInto();
        }
        return undefined;
    }
    async function stepOut(): Promise<ResponsePayload<"stepOut">> {
        logger.debug("received stepOut command");
        if (targetConn) {
            targetConn.stepOut();
        }
        return undefined;
    }
    async function stepOver(): Promise<ResponsePayload<"stepOver">> {
        logger.debug("received stepOver command");
        if (targetConn) {
            targetConn.stepOver();
        }
        return undefined;
    }
    async function getScriptSource(
        _: ServerConnection,
        req: Request<"getScriptSource">,
    ): Promise<ResponsePayload<"getScriptSource">> {
        logger.debug("received getScriptSource command");
        if (targetConn) {
            return {
                script: await targetConn.getScriptSource(req.payload.scriptId),
            };
        } else {
            return {
                // TODO: better error message
                script: "target is not connected",
            };
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
        pause,
        resume,
        stepInto,
        stepOut,
        stepOver,
        getScriptSource,
    });

    server.on("connected", conn => {
        conn.broadcast(reducer.state);
    });
    //server.on("disconnected", _ => {});

    server.on("action", (action: Action) => {
        reducer.action(action);
    });

    reducer.on("update", (state: State) => {
        server.broadcast(state);
    });

    server.start();
}
