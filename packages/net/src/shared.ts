import {
    State,
    Action,
    CallFrameId,
    ScriptId,
    RemoteObject,
    RemoteException,
    LogLevel,
} from "@turbo/core";

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

interface SuccessEvalResponse {
    error: false;
    value: RemoteObject;
}
interface ErrorEvalResponse {
    error: true;
    value: RemoteException | string;
}
export type EvalResponse = SuccessEvalResponse | ErrorEvalResponse;

interface RequestResponse<Req, Res> {
    req: Req;
    res: Res;
}
interface RequestResponseSchema {
    ping: RequestResponse<string, string>;

    eval: RequestResponse<EvalRequest, EvalResponse>;
    pause: RequestResponse<void, void>;
    resume: RequestResponse<void, void>;
    stepInto: RequestResponse<void, void>;
    stepOut: RequestResponse<void, void>;
    stepOver: RequestResponse<void, void>;

    start: RequestResponse<void, void>;
    restart: RequestResponse<void, void>;
    stop: RequestResponse<void, void>;

    getScriptSource: RequestResponse<
        { scriptId: ScriptId },
        { script: string }
    >;
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
