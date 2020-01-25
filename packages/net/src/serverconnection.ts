import {
    SessionId,
    State,
    logger,
    Turbo,
    ClientId,
    AnyMessage,
    isMessageType,
    AnyRequest,
    Response,
    isServerRequestType,
    ServerConnectionEvents,
    ServerConnection,
    ServerRequestType,
} from "@turbo/core";
import { BaseClient, ClientSocket } from "./baseclient";

export class SocketServerConnection extends BaseClient<ServerConnectionEvents>
    implements ServerConnection {
    public readonly id: ClientId;
    constructor(
        turbo: Turbo,
        id: ClientId,
        sessionId: SessionId,
        socket: ClientSocket,
    ) {
        super(turbo, {
            type: "unmanaged",
            sessionId,
            socket,
            connected: true,
            reconnect: false,
        });
        this.id = id;
    }

    public sendState(state: State): void {
        this.sendMessage({
            type: "sync",
            payload: {
                state,
            },
        });
    }

    public sendQuit(): void {
        this.sendMessage({
            type: "quit",
            payload: undefined,
        });
    }

    protected handleUnhandledMessage(msg: AnyMessage): void {
        if (isMessageType("action", msg)) {
            this.fire("action", msg.payload);
        } else if (isMessageType("log", msg)) {
            this.fire("log", msg.payload);
        } else if (isMessageType("quit", msg)) {
            this.fire("quit", undefined);
        } else {
            logger.error(`unhandled message with type ${msg.type}`);
        }
    }
    protected handleUnhandledRequest(
        request: AnyRequest,
    ): Promise<Response<ServerRequestType>["payload"] | undefined> {
        if (isServerRequestType(request)) {
            return new Promise(resolve =>
                this.fire("request", { request, respond: resolve }),
            );
        } else {
            logger.error(`unhandled request with type ${request.type}`);
            return Promise.resolve(undefined);
        }
    }
}
