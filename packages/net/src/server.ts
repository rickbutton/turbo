import * as net from "net";
import {
    JsonSocket,
    createLogger,
    SessionId,
    EmitterBase,
    State,
} from "@turbo/core";
import { ClientId, Message, Request } from "./shared";
import { BaseClient, ClientSocket } from "./baseclient";

const logger = createLogger("daemon");

class Connection extends BaseClient {
    public readonly id: ClientId;
    constructor(id: ClientId, sessionId: SessionId, socket: ClientSocket) {
        super({ sessionId, socket });
        this.id = id;
    }

    public broadcast(state: State): void {
        this.sendMessage({
            type: "sync",
            payload: {
                state,
            },
        });
    }

    protected handleUnhandledMessage(msg: Message): void {
        logger.error(`unhandled message with type ${msg.type}`);
    }
    protected handleUnhandledRequest(req: Request): string | undefined {
        logger.error(`unhandled request with type ${req.type}`);
        return undefined;
    }
}

interface DataEvent {
    connection: Connection;
    data: any;
}
interface ConnectedEvent {
    client: Connection;
}
interface DisconnectedEvent {
    client: Connection;
}
interface ServerEvents {
    data: DataEvent;
    connected: ConnectedEvent;
    disconnected: DisconnectedEvent;
}

export class Server extends EmitterBase<ServerEvents> {
    private lastClientId: ClientId = 0 as ClientId;
    private sessionId: SessionId;
    private server: net.Server = this.createServer();
    private connections: Set<Connection> = new Set();

    constructor(sessionId: SessionId) {
        super();
        this.sessionId = sessionId;

        process.on("SIGHUP", () => {
            this.server.close();
        });
    }

    public start(): void {
        logger.verbose("daemon started");
        this.server.listen(`/tmp/turbo-session-${this.sessionId}`);
    }

    public broadcast(data: any): void {
        for (const c of this.connections) {
            c.broadcast(data);
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

        const client = new Connection(
            this.lastClientId,
            this.sessionId,
            socket,
        );
        logger.info(`client:${client.id} connected`);

        socket.on("close", () => {
            logger.verbose(`connection with client:${client.id} closed`);
            this.connections.delete(client);
            this.fire("disconnected", { client });
        });
        socket.on("data", (data: any) => {
            logger.verbose(`received data from client:${client.id}`);
            this.fire("data", { data, connection: client });
        });
        socket.on("error", (error: Error) => {
            logger.warn(`client:${client.id} error, ${error}`);
        });

        this.connections.add(client);
        this.fire("connected", { client });
    }
}
