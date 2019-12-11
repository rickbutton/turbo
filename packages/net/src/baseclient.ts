import * as net from "net";
import * as uuidv4 from "uuid/v4";
import { JsonSocket, createLogger, SessionId, EmitterBase } from "@turbo/core";
import {
    Message,
    RequestId,
    RequestHandle,
    Response,
    Request,
    PingResponse,
    ResponsePayload,
} from "./shared";

const logger = createLogger("baseclient");
const RESPONSE_TIMEOUT = 5000;

export interface ClientSocketEvents {
    close: void;
    data: any;
    error: Error;
    ready: void;
}
export interface ClientSocket {
    connect(path: string): void;
    write(obj: any): void;

    on<T extends keyof ClientSocketEvents>(
        name: T,
        callback: (event: ClientSocketEvents[T]) => void,
    ): void;
}

export interface BaseClientEvents {
    close: void;
    ready: void;
}

interface UnmanagedClientOptions {
    type: "unmanaged";
    sessionId: SessionId;
    reconnect?: boolean;
    socket: ClientSocket;
    connected: boolean;
}
interface ManagedClientOptions {
    type: "managed";
    sessionId: SessionId;
    reconnect?: boolean;
}
type ClientOptions = UnmanagedClientOptions | ManagedClientOptions;

export abstract class BaseClient<
    T extends BaseClientEvents = BaseClientEvents
> extends EmitterBase<T> {
    private sessionId: SessionId;
    private client: ClientSocket;

    private connected: boolean;
    private reconnect: boolean;

    private inflightRequests: Map<RequestId, RequestHandle> = new Map();

    public constructor(options: ClientOptions) {
        super();
        this.sessionId = options.sessionId;
        this.reconnect =
            typeof options.reconnect === "boolean" ? options.reconnect : true;

        if (options.type === "unmanaged") {
            this.client = options.socket;
            this.connected = options.connected;
        } else {
            this.client = new JsonSocket(new net.Socket());
            this.connected = false;
        }

        this.setup();
    }

    get isConnected(): boolean {
        return this.connected;
    }

    public connect(): void {
        if (!this.connected) {
            this.client.connect(`/tmp/turbo-session-${this.sessionId}`);
        } else {
            throw new Error("attempted to connect already connected socket");
        }
    }

    public async ping(payload: string): Promise<PingResponse["payload"]> {
        const res = await this.sendRequest<PingResponse>({
            type: "ping",
            id: this.generateRequestId(),
            payload,
        });
        return res;
    }

    private setup(): void {
        this.client.on("close", () => {
            this.connected = false;
            this.fire("close", undefined);

            if (this.reconnect) {
                this.connectAfterDelay();
            }
        });
        this.client.on("ready", () => {
            this.connected = true;
            this.fire("ready", undefined);
        });
        this.client.on("data", (msg: Message) => {
            this.handleInboundMessage(msg);
        });
        this.client.on("error", (error: Error) => {
            logger.error(`client error, ${error.toString()}`);
        });
    }

    private connectAfterDelay(): void {
        setTimeout(() => {
            this.connect();
        }, 500);
    }

    private handleInboundMessage(msg: Message): void {
        if (msg.type === "req") {
            const payload = this.handleInboundRequest(msg.payload);
            if (payload) {
                const res = {
                    id: msg.payload.id,
                    payload,
                };
                this.sendResponse(res);
            }
            this.handleInboundRequest(msg.payload);
        } else if (msg.type === "res") {
            this.handleInboundResponse(msg.payload);
        } else {
            this.handleUnhandledMessage(msg);
        }
    }

    private handleInboundRequest(
        req: Request,
    ): Response["payload"] | undefined {
        if (req.type === "ping") {
            return req.payload;
        } else {
            return this.handleUnhandledRequest(req);
        }
    }

    private handleInboundResponse(res: Response): void {
        const handle = this.inflightRequests.get(res.id);
        if (handle) {
            this.inflightRequests.delete(res.id);
            handle.cancelTimeout();
            handle.resolve(res.payload);
        } else {
            logger.error(
                `client received response for unknown request id: ${res.id}`,
            );
        }
    }

    protected abstract handleUnhandledMessage(msg: Message): void;
    protected abstract handleUnhandledRequest(
        req: Request,
    ): ResponsePayload | undefined;

    protected sendRequest<R extends Response>(
        req: Request,
    ): Promise<R["payload"]> {
        return new Promise<R["payload"]>((resolve, reject) => {
            const id = setTimeout(() => {
                reject(new Error("response timeout reached"));
            }, RESPONSE_TIMEOUT);
            function cancelTimeout(): void {
                clearTimeout(id);
            }

            this.inflightRequests.set(req.id, {
                resolve: (value: any) => resolve(value),
                reject: (error: any) => reject(error),
                cancelTimeout,
            });
            this.sendMessage({
                type: "req",
                payload: req,
            });
        });
    }

    private sendResponse(res: Response): void {
        this.sendMessage({
            type: "res",
            payload: res,
        });
    }

    protected sendMessage(obj: Message): void {
        if (this.connected) {
            this.client.write(obj);
        } else {
            throw new Error(
                "attempted to write to client that isn't connected",
            );
        }
    }

    protected generateRequestId(): RequestId {
        return uuidv4() as RequestId;
    }
}
