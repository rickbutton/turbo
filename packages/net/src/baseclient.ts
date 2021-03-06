import { WebSocket } from "./websocket";
import {
    logger,
    SessionId,
    EmitterBase,
    uuid,
    Turbo,
    RequestId,
    RequestHandle,
    Response,
    Request,
    ResponsePayload,
    RequestType,
    AnyMessage,
    AnyResponse,
    AnyRequest,
    isRequest,
    isResponse,
    isRequestType,
    ClientEvents,
} from "@turbo/core";

const RESPONSE_TIMEOUT = 5000;

export interface ClientSocketEvents {
    close: void;
    message: any;
    error: Error;
    ready: void;
}
export interface ClientSocket {
    connect(path: string): void;
    end(): void;
    write(obj: any): void;

    on<T extends keyof ClientSocketEvents>(
        name: T,
        callback: (event: ClientSocketEvents[T]) => void,
    ): void;
}

interface UnmanagedClientOptions {
    type: "unmanaged";
    sessionId: SessionId;
    reconnect?: boolean;
    maxRetries?: number;
    socket: ClientSocket;
    connected: boolean;
}
interface ManagedClientOptions {
    type: "managed";
    sessionId: SessionId;
    reconnect?: boolean;
    maxRetries?: number;
}
export type ClientOptions = UnmanagedClientOptions | ManagedClientOptions;

export abstract class BaseClient<
    T extends ClientEvents = ClientEvents
> extends EmitterBase<T> {
    private socketPath: string;
    private sessionId: SessionId;
    private client: ClientSocket;

    private connected: boolean;
    private reconnect: boolean;
    private maxRetries = 5;
    private numRetries = 0;

    private inflightRequests: Map<RequestId, RequestHandle> = new Map();

    public constructor(turbo: Turbo, options: ClientOptions) {
        super();
        this.sessionId = options.sessionId;
        this.socketPath = turbo.env.getTmpFile("sessions", options.sessionId);
        this.reconnect =
            typeof options.reconnect === "boolean" ? options.reconnect : true;

        if (options.type === "unmanaged") {
            this.client = options.socket;
            this.connected = options.connected;
        } else {
            this.client = new WebSocket();
            this.connected = false;
        }
        if (options.maxRetries) {
            this.maxRetries = options.maxRetries;
        }

        this.setup();
    }

    get isConnected(): boolean {
        return this.connected;
    }

    public connect(): void {
        if (this.numRetries > this.maxRetries) {
            throw new Error("exceeded max retries for connection");
        }

        if (!this.connected) {
            this.client.connect(this.socketPath);
            this.numRetries++;
        } else {
            throw new Error("attempted to connect already connected socket");
        }
    }

    public close(): void {
        this.client.end();
    }

    public async ping(payload: string): Promise<ResponsePayload<"ping">> {
        return await this.sendRequest<"ping">({
            type: "ping",
            id: this.generateRequestId(),
            payload,
        });
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
            this.numRetries = 0;
            this.connected = true;
            this.fire("ready", undefined);
        });
        this.client.on("message", (msg: AnyMessage) => {
            this.handleInboundMessage(msg);
        });
        this.client.on("error", (error: Error) => {
            logger.error(`client error, ${error.toString()}`);
        });
    }

    public connectAfterDelay(): void {
        setTimeout(() => {
            this.connect();
        }, 100); // TODO: don't hardcode this timeout
    }

    private handleInboundMessage(msg: AnyMessage): void {
        if (isRequest(msg)) {
            this.handleInboundRequest(msg.payload).then(payload => {
                this.sendResponse(msg.payload.id, msg.payload.type, payload);
            }); // TODO: return error response
        } else if (isResponse(msg)) {
            this.handleInboundResponse(msg.payload);
        } else if (msg.type === "quit") {
            this.fire("quit", undefined);
        } else {
            this.handleUnhandledMessage(msg);
        }
    }

    private handleInboundRequest(
        req: AnyRequest,
    ): Promise<AnyResponse["payload"] | undefined> {
        if (isRequestType("ping", req)) {
            return Promise.resolve(req.payload);
        } else {
            return Promise.resolve(this.handleUnhandledRequest(req));
        }
    }

    private handleInboundResponse(res: AnyResponse): void {
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

    protected abstract handleUnhandledMessage(msg: AnyMessage): void;
    protected abstract handleUnhandledRequest(
        req: Request<RequestType>,
    ): Promise<Response<RequestType>["payload"]>;

    protected sendRequest<T extends RequestType>(
        req: Request<T>,
    ): Promise<ResponsePayload<T>> {
        return new Promise<ResponsePayload<T>>((resolve, reject) => {
            const id = setTimeout(() => {
                reject(
                    new Error(
                        `response timeout reached for request with type ${req.type}`,
                    ),
                );
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

    private sendResponse<T extends RequestType>(
        id: RequestId,
        type: T,
        payload: ResponsePayload<T>,
    ): void {
        this.sendMessage({
            type: "res",
            payload: {
                id,
                type,
                payload,
            },
        });
    }

    protected sendMessage(obj: AnyMessage): void {
        if (this.connected) {
            this.client.write(obj);
        } else {
            throw new Error(
                "attempted to write to client that isn't connected",
            );
        }
    }

    protected generateRequestId(): RequestId {
        return uuid() as RequestId;
    }
}
