import { Action, SessionId, State, createLogger } from "@turbo/core";
import {
    ClientId,
    AnyMessage,
    isMessageType,
    AnyRequest,
    Response,
    RequestType,
    isRequestType,
    Request,
    ResponsePayload,
} from "./shared";
import { BaseClient, BaseClientEvents, ClientSocket } from "./baseclient";

const logger = createLogger("serverconnection");

export type RequestHandler<T extends RequestType> = (
    connection: ServerConnection,
    req: Request<T>,
) => Promise<ResponsePayload<T>>;
export interface ServerRequestHandler {
    registerTarget: RequestHandler<"registerTarget">;
    updateTarget: RequestHandler<"updateTarget">;
    eval: RequestHandler<"eval">;
}
interface ConnectionEvents extends BaseClientEvents {
    action: Action;
}
export class ServerConnection extends BaseClient<ConnectionEvents> {
    public readonly id: ClientId;
    private handler: ServerRequestHandler;
    constructor(
        id: ClientId,
        sessionId: SessionId,
        socket: ClientSocket,
        handler: ServerRequestHandler,
    ) {
        super({
            type: "unmanaged",
            sessionId,
            socket,
            connected: true,
            reconnect: false,
        });
        this.id = id;
        this.handler = handler;
    }

    public broadcast(state: State): void {
        this.sendMessage({
            type: "sync",
            payload: {
                state,
            },
        });
    }

    protected handleUnhandledMessage(msg: AnyMessage): void {
        if (isMessageType("action", msg)) {
            this.fire("action", msg.payload);
        } else {
            logger.error(`unhandled message with type ${msg.type}`);
        }
    }
    protected handleUnhandledRequest(
        req: AnyRequest,
    ): Promise<Response<RequestType>["payload"] | undefined> {
        if (isRequestType("registerTarget", req)) {
            return this.handler.registerTarget(this, req);
        } else if (isRequestType("updateTarget", req)) {
            return this.handler.updateTarget(this, req);
        } else if (isRequestType("eval", req)) {
            return this.handler.eval(this, req);
        } else {
            logger.error(`unhandled request with type ${req.type}`);
            return Promise.resolve(undefined);
        }
    }
}
