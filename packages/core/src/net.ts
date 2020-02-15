import {
    State,
    Action,
    CallFrameId,
    ScriptId,
    RemoteException,
    LogLevel,
    ObjectId,
    RemoteObjectProperty,
    BreakLocation,
    LogEvent,
    Emitter,
    RemoteObject,
} from ".";

declare const __RequestIdSymbol: unique symbol;
export type RequestId = string & { readonly __tag: typeof __RequestIdSymbol };

declare const __ClientIdSymbol: unique symbol;
export type ClientId = number & { readonly __tag: typeof __ClientIdSymbol };

export interface RequestHandle {
    resolve(data: any): void;
    reject(error: any): void;
    cancelTimeout(): void;
}

interface EvalRequest {
    value: string;
    id: CallFrameId;
}
type EvalResponse =
    | { error: false; value: RemoteObject }
    | { error: true; value: RemoteException | string };
type GetPropertiesResponse =
    | { error: false; value: RemoteObjectProperty[] }
    | { error: true; value: RemoteException | string };
type GetScriptSourceRequest = { scriptId: ScriptId };
type GetScriptSourceResponse = { error: boolean; value: string };
interface GetPossibleBreakpointLocationsRequest {
    id: ScriptId;
}
interface GetPossibleBreakpointLocationsResponse {
    locations: BreakLocation[];
}

interface RequestResponse<Req, Res> {
    req: Req;
    res: Res;
}
interface RequestResponseSchema {
    ping: RequestResponse<string, string>;

    eval: RequestResponse<EvalRequest, EvalResponse>;
    getProperties: RequestResponse<ObjectId, GetPropertiesResponse>;
    pause: RequestResponse<void, void>;
    resume: RequestResponse<void, void>;
    stepInto: RequestResponse<void, void>;
    stepOut: RequestResponse<void, void>;
    stepOver: RequestResponse<void, void>;

    getPossibleBreakpointLocations: RequestResponse<
        GetPossibleBreakpointLocationsRequest,
        GetPossibleBreakpointLocationsResponse
    >;
    getScriptSource: RequestResponse<
        GetScriptSourceRequest,
        GetScriptSourceResponse
    >;

    start: RequestResponse<void, void>;
    restart: RequestResponse<void, void>;
    stop: RequestResponse<void, void>;
}
export type RequestType = keyof RequestResponseSchema;
export interface Request<T extends RequestType> {
    id: RequestId;
    type: T;
    payload: RequestResponseSchema[T]["req"];
}
export interface Response<T extends RequestType> {
    id: RequestId;
    type: T;
    payload: RequestResponseSchema[T]["res"];
}
export type AnyRequest = Request<RequestType>;
export type AnyResponse = Response<RequestType>;
export type RequestPayload<T extends RequestType> = Request<T>["payload"];
export type ResponsePayload<T extends RequestType> = Response<T>["payload"];

interface LogData {
    level: LogLevel;
    msg: string;
}
interface SyncData {
    state: State;
}
interface MessageSchema {
    log: LogData;
    sync: SyncData;
    action: Action;
    req: AnyRequest;
    res: AnyResponse;
    quit: void;
}
type MessageType = keyof MessageSchema;
export interface Message<T extends MessageType> {
    type: T;
    payload: MessageSchema[T];
}
export type AnyMessage = Message<MessageType>;
export type MessagePayload<T extends MessageType> = Message<T>["payload"];

export function isRequest(message: AnyMessage): message is Message<"req"> {
    return message.type == "req";
}
export function isResponse(message: AnyMessage): message is Message<"res"> {
    return message.type == "res";
}
export function isMessageType<T extends MessageType>(
    type: T,
    msg: AnyMessage,
): msg is Message<T> {
    return msg.type === type;
}
export function isRequestType<T extends RequestType>(
    type: T,
    req: AnyRequest,
): req is Request<T> {
    return req.type === type;
}

export interface ClientEvents {
    close: void;
    ready: void;
    sync: State;
    quit: void;
}

export interface RequestEvent<T extends RequestType> {
    request: Request<T>;
    respond(payload: ResponsePayload<T> | Promise<ResponsePayload<T>>): void;
}

export const SERVER_REQUEST_TYPES: ServerRequestType[] = [
    "eval",
    "getProperties",
    "getPossibleBreakpointLocations",
    "getScriptSource",
];
export type ServerRequestType =
    | "eval"
    | "getProperties"
    | "getPossibleBreakpointLocations"
    | "getScriptSource";
export function isServerRequestType<T extends ServerRequestType>(
    req: AnyRequest,
): req is Request<T> {
    return SERVER_REQUEST_TYPES.includes(req.type as any);
}

export interface ServerConnectionEvents extends ClientEvents {
    action: Action;
    log: LogEvent;
    request: RequestEvent<ServerRequestType>;
}
export interface ServerConnection extends Emitter<ServerConnectionEvents> {
    id: ClientId;
    sendState(state: State): void;
    sendQuit(): void;
}

export interface ServerEvents {
    ready: void;
    error: Error;
    log: MessagePayload<"log">;
    action: Action;
    connected: ServerConnection;
    disconnected: ServerConnection;
    request: RequestEvent<ServerRequestType>;
    quit: void;
}
export interface Server extends Emitter<ServerEvents> {
    start(): void;
    stop(): void;
    broadcastState(state: State): void;
    broadcastQuit(): void;
    numConnections: number;
}
