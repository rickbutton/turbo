import { State, Action } from "@turbo/core";

declare const __RequestIdSymbol: unique symbol;
export type RequestId = string & { readonly __tag: typeof __RequestIdSymbol };

declare const __ClientIdSymbol: unique symbol;
export type ClientId = number & { readonly __tag: typeof __ClientIdSymbol };

export interface RequestHandle {
    resolve(data: any): void;
    reject(error: any): void;
    cancelTimeout(): void;
}

interface RequestResponse<Req, Res> {
    req: Req;
    res: Res;
}
interface RequestResponseSchema {
    ping: RequestResponse<string, string>;
    eval: RequestResponse<{ value: string }, { value: string }>;

    registerTarget: RequestResponse<undefined, { error?: string }>;
    updateTarget: RequestResponse<
        { host: string; port: number } | undefined,
        { error?: string }
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

interface SyncData {
    state: State;
}
interface MessageSchema {
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
