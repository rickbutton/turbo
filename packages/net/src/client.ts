import {
    createLogger,
    State,
    Action,
    CallFrameId,
    ScriptId,
} from "@turbo/core";
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
    private lastState: State | null = null;

    public get state(): State | null {
        return this.lastState;
    }

    public action(action: Action): void {
        this.sendMessage({
            type: "action",
            payload: action,
        });
    }

    public eval(
        value: string,
        id: CallFrameId,
    ): Promise<ResponsePayload<"eval">> {
        return this.sendRequest({
            type: "eval",
            id: this.generateRequestId(),
            payload: {
                value,
                id,
            },
        });
    }

    public pause(): Promise<ResponsePayload<"pause">> {
        return this.sendRequest({
            type: "pause",
            id: this.generateRequestId(),
            payload: undefined,
        });
    }

    public resume(): Promise<ResponsePayload<"resume">> {
        return this.sendRequest({
            type: "resume",
            id: this.generateRequestId(),
            payload: undefined,
        });
    }

    public stepInto(): Promise<ResponsePayload<"stepInto">> {
        return this.sendRequest({
            type: "stepInto",
            id: this.generateRequestId(),
            payload: undefined,
        });
    }

    public stepOut(): Promise<ResponsePayload<"stepOut">> {
        return this.sendRequest({
            type: "stepOut",
            id: this.generateRequestId(),
            payload: undefined,
        });
    }

    public stepOver(): Promise<ResponsePayload<"stepOver">> {
        return this.sendRequest({
            type: "stepOver",
            id: this.generateRequestId(),
            payload: undefined,
        });
    }

    public getScriptSource(
        scriptId: ScriptId,
    ): Promise<ResponsePayload<"getScriptSource">> {
        return this.sendRequest({
            type: "getScriptSource",
            id: this.generateRequestId(),
            payload: { scriptId },
        });
    }

    protected handleUnhandledMessage(msg: AnyMessage): void {
        if (isMessageType("sync", msg)) {
            this.lastState = msg.payload.state;
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
