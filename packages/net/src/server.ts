import net from "net";
import {
    JsonSocket,
    SessionId,
    EmitterBase,
    State,
    Action,
    logger,
} from "@turbo/core";
import { ClientId, MessagePayload } from "./shared";
import { ServerConnection, ServerRequestHandler } from "./serverconnection";

interface ServerEvents {
    ready: void;
    log: MessagePayload<"log">;
    action: Action;
    connected: ServerConnection;
    disconnected: ServerConnection;
}

export class Server extends EmitterBase<ServerEvents> {
    private lastClientId: ClientId = 0 as ClientId;
    private sessionId: SessionId;
    private server: net.Server = this.createServer();
    private connections: Set<ServerConnection> = new Set();
    private handler: ServerRequestHandler;

    constructor(sessionId: SessionId, handler: ServerRequestHandler) {
        super();
        this.sessionId = sessionId;
        this.handler = handler;

        process.on("SIGHUP", () => {
            this.server.close();
        });
    }

    public start(): void {
        this.server.listen(`/tmp/turbo-session-${this.sessionId}`);
    }

    public broadcast(state: State): void {
        for (const c of this.connections) {
            c.broadcast(state);
        }
    }

    private createServer(): net.Server {
        const server = net.createServer();

        server.on("connection", (socket: net.Socket) =>
            this.handleSocket(socket),
        );
        server.on("error", (error: Error) => {
            logger.error(`daemon error, ${error.toString()}`);
            this.startAfterDelay();
        });
        server.on("listening", () => {
            logger.verbose("daemon listening");
        });
        server.on("ready", () => {
            this.fire("ready", undefined);
        });

        return server;
    }

    private startAfterDelay(): void {
        setTimeout(() => {
            this.start();
        }, 2000);
    }

    private handleSocket(rawSocket: net.Socket): void {
        const socket = new JsonSocket(rawSocket);

        this.lastClientId = (this.lastClientId + 1) as ClientId;

        const client = new ServerConnection(
            this.lastClientId,
            this.sessionId,
            socket,
            this.handler,
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

        this.connections.add(client);
        this.fire("connected", client);
    }
}
