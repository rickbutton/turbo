import { State } from "@turbo/core";

declare const __RequestIdSymbol: unique symbol;
export type RequestId = string & { readonly __tag: typeof __RequestIdSymbol };

declare const __ClientIdSymbol: unique symbol;
export type ClientId = number & { readonly __tag: typeof __ClientIdSymbol };

interface BaseMessage<T extends string, D> {
    type: T;
    payload: D;
}

interface BaseRequest<T extends string, P> {
    id: RequestId;
    type: T;
    payload: P;
}
interface BaseResponse<P> {
    id: RequestId;
    payload: P;
}

interface SyncData {
    state: State;
}
export type SyncMessage = BaseMessage<"sync", SyncData>;

export type PingRequest = BaseRequest<"ping", string>;
export type PingResponse = BaseResponse<string>;

export type EvalRequest = BaseRequest<"eval", string>;
export type EvalResponse = BaseResponse<string>;

export type Request = PingRequest | EvalRequest;
export type Response = PingResponse | EvalResponse;
export type ResponsePayload = Response["payload"];

export type RequestMessage = BaseMessage<"req", Request>;
export type ResponseMessage = BaseMessage<"res", Response>;

export type Message = SyncMessage | RequestMessage | ResponseMessage;

export interface RequestHandle {
    resolve(data: any): void;
    reject(error: any): void;
    cancelTimeout(): void;
}
