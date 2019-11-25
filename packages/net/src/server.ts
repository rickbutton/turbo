import * as net from "net";
import { JsonSocket, createLogger, SessionId, EmitterBase } from "@jug/core";

const logger = createLogger("daemon");

interface Client {
    id: number;
    send(data: any): void;
}

interface DataEvent {
    client: Client;
    data: any;
}
interface ConnectedEvent {
    client: Client;
}
interface DisconnectedEvent {
    client: Client;
}
interface ServerEvents {
    data: DataEvent;
    connected: ConnectedEvent;
    disconnected: DisconnectedEvent;
}

export class Server extends EmitterBase<ServerEvents> {
    private lastClientId = 0;
    private sessionId: SessionId;
    private server: net.Server = this.createServer();
    private connections: Set<Client> = new Set();

    constructor(sessionId: SessionId) {
        super();
        this.sessionId = sessionId;

        process.on("SIGHUP", () => {
            this.server.close();
        });
    }

    public start(): void {
        logger.verbose("daemon started");
        this.server.listen(`/tmp/jug-session-${this.sessionId}`);
    }

    public broadcast(data: any): void {
        for (const c of this.connections) {
            c.send(data);
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

        this.lastClientId++;

        const client: Client = {
            id: this.lastClientId,
            send(data: any): void {
                socket.write(data);
            },
        };
        logger.info(`client:${client.id} connected`);

        socket.on("close", () => {
            logger.verbose(`connection with client:${client.id} closed`);
            this.connections.delete(client);
            this.fire("disconnected", { client });
        });
        socket.on("data", (data: any) => {
            logger.verbose(`received data from client:${client.id}`);
            this.fire("data", { data, client });
        });
        socket.on("error", (error: Error) => {
            logger.warn(`client:${client.id} error, ${error}`);
        });

        this.connections.add(client);
        this.fire("connected", { client });
    }
}
