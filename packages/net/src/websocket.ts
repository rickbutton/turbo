import ws from "ws";
import fs from "fs";
import getPort from "get-port";
import { ClientSocketEvents } from "./baseclient";
import { EmitterBase, logger } from "@turbo/core";
import { SocketServerEvents } from "./server";

function tryUnlink(path: string): void {
    try {
        fs.unlinkSync(path);
    } catch (e) {
        // ignore error
    }
}

export class WebSocket extends EmitterBase<ClientSocketEvents> {
    private socket: ws | null = null;

    public constructor(socket?: ws) {
        super();
        if (socket) {
            this.socket = socket;
            this.setup();
        }
    }

    public connect(path: string): void {
        let error = true;
        try {
            let url: string;
            if (fs.existsSync(path)) {
                url = fs.readFileSync(path).toString();
                this.socket = new ws(url);
                this.setup();
            } else {
                this.fire("error", new Error(`missing session file ${path}`));
                this.fire("close", undefined);
            }
            error = false;
        } finally {
            if (error) {
                this.socket = null;
            }
        }
    }

    private setup(): void {
        if (!this.socket) throw new Error("attempted to setup without socket");

        this.socket.on("close", () => this.fire("close", undefined));
        this.socket.on("message", (e: any) => {
            let obj: any;
            try {
                const data = e.toString();
                obj = JSON.parse(data);
            } catch (e) {
                logger.error("unable to parse data from client");
                logger.error(e.toString());
            }
            if (obj) {
                this.fire("message", obj);
            }
        });
        this.socket.on("error", e => this.fire("error", e));
        this.socket.on("open", () => this.fire("ready", undefined));
    }

    public end(): void {
        if (this.socket) {
            this.socket.close();
        }
    }
    public write(obj: any): void {
        if (this.socket) {
            this.socket.send(JSON.stringify(obj));
        } else {
            throw new Error(`attempted to write to non-open WebSocket`);
        }
    }
}

export class WebSocketServer extends EmitterBase<SocketServerEvents> {
    private server: ws.Server | null = null;

    public async listen(sessionFile: string): Promise<void> {
        let error = true;
        try {
            const onConnection = (socket: ws): void => {
                this.fire("connection", new WebSocket(socket));
            };
            const onError = (e: Error): void => {
                this.fire("error", e);
            };
            const onListening = (): void => {
                if (this.server) {
                    const addr = this.server.address();
                    fs.writeFileSync(
                        sessionFile,
                        typeof addr === "string"
                            ? addr
                            : `ws://${addr.address}:${addr.port}`,
                    );
                    this.fire("ready", undefined);
                }
            };

            const onClose = (): void => {
                if (this.server) {
                    this.server.off("connection", onConnection);
                    this.server.off("error", onError);
                    this.server.off("listening", onListening);
                    this.server.off("close", onClose);
                }

                tryUnlink(sessionFile);
                this.fire("close", undefined);
            };

            if (this.server) {
                onError(
                    new Error(
                        `attempted to listen for WebSocketServer that is listening`,
                    ),
                );
            }

            if (fs.existsSync(sessionFile)) {
                onError(new Error(`${sessionFile} already exists`));
            }

            const host = "localhost"; // TODO: configure
            const port = await getPort();

            this.server = new ws.Server({
                host,
                port,
            });
            this.server.on("connection", onConnection);
            this.server.on("error", onError);
            this.server.on("listening", onListening);
            this.server.on("close", onClose);

            process.on("exit", () => {
                if (this.server) {
                    this.server.close();
                }
                tryUnlink(sessionFile);
            });
            process.on("SIGINT", () => {
                tryUnlink(sessionFile);
                process.exit(0);
            });

            error = false;
        } catch (e) {
            this.fire("error", e);
        } finally {
            if (error) {
                if (this.server) {
                    this.server.close();
                }
                this.server = null;
                tryUnlink(sessionFile);
            }
        }
    }

    public close(): void {
        if (this.server) {
            this.server.close();
        }
    }
}
