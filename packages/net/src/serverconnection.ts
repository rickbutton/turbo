import { Action, SessionId, State, logger, LogEvent, Turbo } from "@turbo/core";
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

export type RequestHandler<T extends RequestType> = (
    req: Request<T>,
) => Promise<ResponsePayload<T>>;
export interface ServerRequestHandler {
    eval: RequestHandler<"eval">;
    pause: RequestHandler<"pause">;
    resume: RequestHandler<"resume">;
    stepInto: RequestHandler<"stepInto">;
    stepOut: RequestHandler<"stepOut">;
    stepOver: RequestHandler<"stepOver">;
    getScriptSource: RequestHandler<"getScriptSource">;
}
interface ConnectionEvents extends BaseClientEvents {
    action: Action;
    log: LogEvent;
}
export class ServerConnection extends BaseClient<ConnectionEvents> {
    public readonly id: ClientId;
    private handler: ServerRequestHandler;
    constructor(
        turbo: Turbo,
        id: ClientId,
        sessionId: SessionId,
        socket: ClientSocket,
        handler: ServerRequestHandler,
    ) {
        super(turbo, {
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
        } else if (isMessageType("log", msg)) {
            this.fire("log", msg.payload);
        } else {
            logger.error(`unhandled message with type ${msg.type}`);
        }
    }
    protected handleUnhandledRequest(
        req: AnyRequest,
    ): Promise<Response<RequestType>["payload"] | undefined> {
        if (isRequestType("eval", req)) {
            return this.handler.eval(req);
        } else if (isRequestType("pause", req)) {
            return this.handler.pause(req);
        } else if (isRequestType("resume", req)) {
            return this.handler.resume(req);
        } else if (isRequestType("stepInto", req)) {
            return this.handler.stepInto(req);
        } else if (isRequestType("stepOut", req)) {
            return this.handler.stepOut(req);
        } else if (isRequestType("stepOver", req)) {
            return this.handler.stepOver(req);
        } else if (isRequestType("getScriptSource", req)) {
            return this.handler.getScriptSource(req);
        } else {
            logger.error(`unhandled request with type ${req.type}`);
            return Promise.resolve(undefined);
        }
    }
}
