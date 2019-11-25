import * as net from "net";
import {
    JsonSocket,
    createLogger,
    SessionId,
    EmitterBase,
    State,
    Action,
} from "@jug/core";

const logger = createLogger("client");

interface ClientEvents {
    close: boolean;
    state: State;
    ready: void;
}

interface ClientSocketEvents {
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

export class Client extends EmitterBase<ClientEvents> {
    private sessionId: SessionId;
    private client: ClientSocket;

    constructor(sessionId: SessionId, client: ClientSocket);
    constructor(sessionId: SessionId);
    constructor(sessionId: SessionId, client?: ClientSocket) {
        super();
        this.sessionId = sessionId;
        this.client = client || new JsonSocket(new net.Socket());

        this.setup();
    }

    public connect(): void {
        this.client.connect(`/tmp/jug-session-${this.sessionId}`);
    }

    public send(obj: Action): void {
        this.client.write(obj);
    }

    private setup(): void {
        this.client.on("close", () => {
            this.connectAfterDelay();
        });
        this.client.on("data", (data: any) => this.fire("state", data));
        this.client.on("error", (error: Error) => {
            logger.error(`client error, ${error.toString()}`);
        });
        this.client.on("ready", () => this.fire("ready", undefined));
    }

    private connectAfterDelay(): void {
        setTimeout(() => {
            this.connect();
        }, 500);
    }
}
