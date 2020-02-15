import net from "net";
import fs from "fs";
import { uuid, EmitterBase, Turbo, Logger } from "@turbo/core";

const MAX_BUFFER_LENGTH = 4096;

interface LogServerEvents {
    ready: void;
    error: Error;
}
export class SocketLogServer extends EmitterBase<LogServerEvents>
    implements Logger {
    private server: net.Server;
    private connections = new Set<net.Socket>();
    private buffer: string[] = [];

    public readonly socketPath: string;

    public static create(turbo: Turbo): Promise<SocketLogServer> {
        return new Promise<SocketLogServer>((resolve, reject) => {
            const server = new SocketLogServer(turbo);
            server.once("ready", () => {
                resolve(server);
            });
            server.once("error", () => {
                reject(server);
            });
            server.start();
        });
    }

    private constructor(turbo: Turbo) {
        super();

        this.socketPath = turbo.env.getTmpFile("logs", uuid());
        this.server = net.createServer();
        this.server.unref();

        this.server.on("connection", socket => {
            this.connections.add(socket);

            socket.on("end", () => {
                this.connections.delete(socket);
            });
            socket.on("close", () => {
                this.connections.delete(socket);
            });

            for (const line of this.buffer) {
                socket.write(line);
            }
        });
        this.server.on("error", error => {
            this.fire("error", error);
        });

        this.server.on("listening", () => {
            this.fire("ready", undefined);
        });
        this.server.on("close", () => {
            try {
                fs.unlinkSync(this.socketPath);
            } catch {}
        });
    }

    public start(): void {
        this.server.listen(this.socketPath);
    }

    public log(msg: string): void {
        for (const conn of this.connections) {
            try {
                conn.write(msg);
            } catch (e) {
                console.error(e.message);
            }
        }
        this.buffer.push(msg);
        if (this.buffer.length > MAX_BUFFER_LENGTH) {
            this.buffer.shift();
        }
    }
}

interface LogClientEvents {
    data: string;
}
export class LogClient extends EmitterBase<LogClientEvents> {
    private path: string;
    private socket: net.Socket;

    constructor(path: string) {
        super();
        this.path = path;
        this.socket = new net.Socket();

        this.socket.on("close", () => {
            this.connectAfterDelay();
        });
        this.socket.on("data", data => {
            this.fire("data", data.toString());
        });
    }

    public connect(): void {
        this.socket.connect(this.path);
    }

    private connectAfterDelay(): void {
        setTimeout(() => {
            this.connect();
        }, 3000); // TODO: don't hardcode
    }
}
