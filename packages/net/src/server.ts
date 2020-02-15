import {
    SessionId,
    EmitterBase,
    State,
    Action,
    logger,
    Turbo,
    ClientId,
    Server,
    ServerEvents,
} from "@turbo/core";
import { SocketServerConnection } from "./serverconnection";
import { WebSocket, WebSocketServer } from "./websocket";

export interface SocketServerEvents {
    connection: WebSocket;
    error: Error;
    ready: void;
    close: void;
}

export interface SocketServer {
    listen(sessionFile: string): void;
    close(): void;

    on<T extends keyof SocketServerEvents>(
        name: T,
        callback: (event: SocketServerEvents[T]) => void,
    ): void;
}

export class TurboServer extends EmitterBase<ServerEvents> implements Server {
    private turbo: Turbo;
    private lastClientId: ClientId = 0 as ClientId;
    private sessionFile: string;
    private sessionId: SessionId;
    private server: SocketServer = this.createServer();
    private connections: Set<SocketServerConnection> = new Set();

    get numConnections(): number {
        return this.connections.size;
    }

    constructor(turbo: Turbo, sessionId: SessionId) {
        super();
        this.turbo = turbo;
        this.sessionFile = turbo.env.getTmpFile("sessions", sessionId);
        this.sessionId = sessionId;
    }

    public start(): void {
        this.server.listen(this.sessionFile);
    }

    public stop(): void {
        this.server.close();
    }

    public broadcastState(state: State): void {
        for (const c of this.connections) {
            c.sendState(state);
        }
    }

    public broadcastQuit(): void {
        for (const c of this.connections) {
            c.sendQuit();
        }
    }

    private createServer(): SocketServer {
        const server = new WebSocketServer();

        const onConnection = (socket: WebSocket): void => {
            this.handleSocket(socket);
        };
        const onError = (error: Error): void => {
            this.fire("error", error);
        };
        const onReady = (): void => {
            this.fire("ready", undefined);
        };
        const onClose = (): void => {
            server.off("connection", onConnection);
            server.off("error", onError);
            server.off("ready", onReady);
            server.off("close", onClose);
        };
        server.on("connection", onConnection);
        server.on("error", onError);
        server.on("ready", onReady);
        server.on("close", onClose);

        return server;
    }

    private startAfterDelay(): void {
        setTimeout(() => {
            this.start();
        }, 2000);
    }

    private handleSocket(socket: WebSocket): void {
        this.lastClientId = (this.lastClientId + 1) as ClientId;

        const client = new SocketServerConnection(
            this.turbo,
            this.lastClientId,
            this.sessionId,
            socket,
        );
        logger.info(`client:${client.id} connected`);

        client.on("close", () => {
            logger.verbose(`connection with client:${client.id} closed`);
            this.connections.delete(client);
            this.fire("disconnected", client);
        });
        client.on("action", (action: Action) => {
            this.fire("action", action);
        });
        client.on("log", log => {
            this.fire("log", log);
        });
        client.on("quit", () => this.fire("quit", undefined));
        client.on("request", event => this.fire("request", event));

        this.connections.add(client);
        this.fire("connected", client);
    }
}
