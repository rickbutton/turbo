/* eslint-disable @typescript-eslint/explicit-function-return-type */

import {
    logger,
    Action,
    State,
    Server,
    ServerConnection,
    RequestEvent,
    TargetConnection,
    isRequestType,
    Turbo,
} from "..";
import { eventChannel, channel, END, Channel, EventChannel } from "redux-saga";
import { select, put, take, fork, takeLatest } from "redux-saga/effects";

// TODO FOR ME TOMORROW!
//
// switch this channel to use custom server events
// and switch the req->res things to emits of actions
// in while(true) of server, switch between some: (think of more!)
// - turbo actions - emit back up directly
// - eval - have connection and call the "respond" method
// - getProperties - ^^
// - getPossibleBreakpointLocations - ^^
//
// the above requires communicating the "latest" TargetConnection
// to that while(true) loop

type ServerRequestType =
    | "eval"
    | "getProperties"
    | "getPossibleBreakpointLocations"
    | "getScriptSource";

function setupServer(
    turbo: Turbo,
    server: Server,
): [
    EventChannel<Action>,
    Channel<ServerConnection>,
    Channel<RequestEvent<ServerRequestType>>,
] {
    const connectionChannel = channel<ServerConnection>();
    const requestChannel = channel<RequestEvent<ServerRequestType>>();

    const serverChannel = eventChannel<Action>(emit => {
        function onAction(action: Action): void {
            emit(action);
        }
        function onConnection(conn: ServerConnection): void {
            connectionChannel.put(conn);

            conn.on("close", () => {
                setTimeout(() => {
                    // TODO: wait for log servers as well
                    if (server.numConnections === 0) {
                        // TODO: log this message somewhere
                        // TODO: only exit if in config
                        logger.error(
                            "closing daemon because all clients disconnected",
                        );
                        onQuit();
                    }
                }, 5000); // TODO: don't hardcode
            });
        }
        function onRequest(req: RequestEvent<ServerRequestType>): void {
            requestChannel.put(req);
        }
        function onQuit(): void {
            server.broadcastQuit();
            emit(END);
            setTimeout(() => {
                turbo.env.exit();
            }, 1000);
        }

        server.on("action", onAction);
        server.on("connected", onConnection);
        server.on("request", onRequest);
        server.on("quit", onQuit);

        server.start();
        return () => {
            server.off("action", onAction);
            server.off("connected", onConnection);
            server.off("request", onRequest);
            server.off("quit", onQuit);

            connectionChannel.put(END);
            requestChannel.put(END);
            logger.verbose("server is being destroyed");
            server.stop();
        };
    });

    return [serverChannel, connectionChannel, requestChannel];
}

function* watchForNewConnections(channel: Channel<ServerConnection>) {
    while (true) {
        const conn: ServerConnection = yield take(channel);
        logger.verbose(`handling new connection: ${conn.id}`);
        const state: State = yield select();

        conn.sendState(state);
    }
}

function* watchForServerActions(channel: EventChannel<Action>) {
    while (true) {
        const action: Action = yield take(channel);
        logger.verbose(`handling server action: ${action.type}`);
        yield put(action);
    }
}

function* watchForServerRequests(
    requestChannel: Channel<RequestEvent<ServerRequestType>>,
    targetConnection: TargetConnection | -1,
) {
    while (true) {
        const event: RequestEvent<ServerRequestType> = yield take(
            requestChannel,
        );
        const { request, respond } = event;

        if (isRequestType("eval", request)) {
            if (targetConnection !== -1) {
                respond(
                    targetConnection.eval(
                        request.payload.value,
                        request.payload.id,
                    ),
                );
            } else {
                respond({
                    error: true,
                    value: `unable to evaluate because the target is not connected`,
                });
            }
        } else if (isRequestType("getScriptSource", request)) {
            if (targetConnection !== -1) {
                respond(
                    targetConnection
                        .getScriptSource(request.payload.scriptId)
                        .then(value => ({ error: false, value })),
                );
            } else {
                return {
                    error: true,
                    value: `unable to get source because the target is not connected`,
                };
            }
        } else if (isRequestType("getProperties", request)) {
            if (targetConnection !== -1) {
                respond(targetConnection.getProperties(request.payload));
            } else {
                respond({
                    error: true,
                    value: `unable to get properties because the target is not connected`,
                });
            }
        } else if (isRequestType("getPossibleBreakpointLocations", request)) {
            throw new Error();
        } else {
            throw new Error(
                `unhandled request type in server saga: ${request.type}`,
            );
        }
    }
}

export function* serverFlow(
    turbo: Turbo,
    server: Server,
    targetConnectionChannel: Channel<TargetConnection | -1>,
) {
    const [serverChannel, connectionChannel, requestChannel] = setupServer(
        turbo,
        server,
    );

    yield fork(watchForNewConnections, connectionChannel);
    yield fork(watchForServerActions, serverChannel);

    yield takeLatest(
        // TODO: fix this cast
        targetConnectionChannel as any,
        watchForServerRequests,
        requestChannel,
    );
}
