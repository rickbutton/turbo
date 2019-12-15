import { createLogger, State, Action } from "@turbo/core";
import {
    ResponsePayload,
    AnyMessage,
    isMessageType,
    AnyRequest,
    Response,
    RequestType,
} from "./shared";
import { BaseClient, BaseClientEvents } from "./baseclient";

const logger = createLogger("client");

interface ClientEvents extends BaseClientEvents {
    sync: State;
}

export class Client extends BaseClient<ClientEvents> {
    public action(action: Action): void {
        this.sendMessage({
            type: "action",
            payload: action,
        });
    }

    public registerTarget(): Promise<ResponsePayload<"registerTarget">> {
        return this.sendRequest({
            type: "registerTarget",
            id: this.generateRequestId(),
            payload: undefined,
        });
    }

    public updateTarget(
        target: { host: string; port: number } | undefined,
    ): Promise<ResponsePayload<"updateTarget">> {
        return this.sendRequest({
            type: "updateTarget",
            id: this.generateRequestId(),
            payload: target
                ? { host: target.host, port: target.port }
                : undefined,
        });
    }

    public eval(value: string): Promise<ResponsePayload<"eval">> {
        return this.sendRequest({
            type: "eval",
            id: this.generateRequestId(),
            payload: { value },
        });
    }

    protected handleUnhandledMessage(msg: AnyMessage): void {
        if (isMessageType("sync", msg)) {
            this.fire("sync", msg.payload.state);
        } else {
            logger.error(`unhandled message with type ${msg.type}`);
        }
    }
    protected handleUnhandledRequest(
        req: AnyRequest,
    ): Promise<Response<RequestType>["payload"] | undefined> {
        logger.error(`unhandled request with type ${req.type}`);
        return Promise.resolve(undefined);
    }
}
