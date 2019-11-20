import * as net from "net";
import { JsonSocket, createLogger, SessionId, EmitterBase } from "@jug/core";

const logger = createLogger("daemon");

interface DaemonEvents {
    data: any;
}

export class Daemon extends EmitterBase<DaemonEvents> {
    private sessionId: SessionId;
    private server: net.Server = this.createServer();

    constructor(sessionId: SessionId) {
        super();
        this.sessionId = sessionId;
    }

    public start(): void {
        logger.verbose("daemon started");
        this.server.listen(`/tmp/jug-sessions/${this.sessionId}`);
    }

    private createServer(): net.Server {
        const server = net.createServer();

        server.on("close", () => {
            logger.info("daemon closed, restarting");
            this.startAfterDelay();
        });
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
        socket.on("close", () => {
            logger.verbose("connection with client closed"); // TODO: client id?
            // remove socket
        });
        socket.on("data", (data: any) => {
            logger.debug("received data from client"); // TODO: client id?
            this.fire("data", data);
        });
        socket.on("error", (error: Error) => {
            logger.warn(`client error, ${error}`); // TODO: client id?
        });
        socket.on("ready", () => {
            logger.info("client connected"); // TODO: client id?
            // handle, add to map
        });
    }
}

export function startDaemon(sessionId: SessionId): void {
    const daemon = new Daemon(sessionId);

    daemon.start();
}
