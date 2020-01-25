import {
    logger,
    State,
    Action,
    CallFrameId,
    ScriptId,
    LogEvent,
    Turbo,
    ObjectId,
    ResponsePayload,
    AnyMessage,
    isMessageType,
    AnyRequest,
    Response,
    RequestType,
    ClientEvents,
} from "@turbo/core";
import { BaseClient, ClientOptions } from "./baseclient";

export class Client extends BaseClient<ClientEvents> {
    private lastState: State | null = null;

    private bufferLogs = true;
    private logBuffer: LogEvent[] = [];

    constructor(turbo: Turbo, options: ClientOptions) {
        super(turbo, options);

        logger.on("log", this.sendLog.bind(this));
        this.on("ready", () => {
            this.bufferLogs = false;
            this.flushLogs();
        });
        this.on("close", () => {
            this.bufferLogs = true;
        });
    }

    public get state(): State | null {
        return this.lastState;
    }

    public dispatch(action: Action): void {
        this.sendMessage({
            type: "action",
            payload: action,
        });
    }

    public quit(): void {
        this.sendMessage({ type: "quit", payload: undefined });
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

    public getProperties(
        objectId: ObjectId,
    ): Promise<ResponsePayload<"getProperties">> {
        return this.sendRequest({
            type: "getProperties",
            id: this.generateRequestId(),
            payload: objectId,
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

    private flushLogs(): void {
        // TODO: flush logs automatically on process exit to
        // stdout or file if there are buffered logs
        for (const log of this.logBuffer) {
            this.sendLog(log);
        }
        this.logBuffer = [];
    }

    private sendLog(log: LogEvent): void {
        if (this.bufferLogs) {
            this.logBuffer.push(log);
        } else {
            this.sendMessage({
                type: "log",
                payload: log,
            });
        }
    }
}
