import net from "net";
import fs from "fs";
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
import { JsonSocket } from "./jsonsocket";
import { SocketServerConnection } from "./serverconnection";

export class SocketServer extends EmitterBase<ServerEvents> implements Server {
    private turbo: Turbo;
    private lastClientId: ClientId = 0 as ClientId;
    private socketPath: string;
    private sessionId: SessionId;
    private server: net.Server = this.createServer();
    private connections: Set<SocketServerConnection> = new Set();

    get numConnections(): number {
        return this.connections.size;
    }

    constructor(turbo: Turbo, sessionId: SessionId) {
        super();
        this.turbo = turbo;
        this.socketPath = turbo.env.getTmpFile("sessions", sessionId);
        this.sessionId = sessionId;

        process.on("exit", () => {
            this.server.close();
            fs.unlinkSync(this.socketPath);
        });
        process.on("SIGHUP", () => {
            this.server.close();
            fs.unlinkSync(this.socketPath);
        });
    }

    public start(): void {
        this.server.listen(this.socketPath);
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
        server.on("close", () => {
            fs.unlinkSync(this.socketPath);
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
