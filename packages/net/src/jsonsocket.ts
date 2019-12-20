import * as net from "net";
import * as stream from "stream";

const MAX_LENGTH = 2 ** 18;

export class JsonSocket extends stream.Duplex {
    private readingPaused = false;
    private socket: net.Socket;

    constructor(socket: net.Socket) {
        super({ objectMode: true });
        this.socket = socket;
        if (socket) this.wrapSocket(socket);
    }

    public connect(path: string): void {
        this.socket.connect(path);
    }

    private wrapSocket(socket: net.Socket): void {
        this.socket = socket;
        this.socket.on("close", hadError => this.emit("close", hadError));
        this.socket.on("connect", () => this.emit("connect"));
        this.socket.on("drain", () => this.emit("drain"));
        this.socket.on("end", () => this.emit("end"));
        this.socket.on("error", err => this.emit("error", err));
        this.socket.on("lookup", (err, address, family, host) =>
            this.emit("lookup", err, address, family, host),
        );
        this.socket.on("ready", () => this.emit("ready"));
        this.socket.on("timeout", () => this.emit("timeout"));
        this.socket.on("readable", this.onReadable.bind(this));
    }

    private onReadable(): void {
        while (!this.readingPaused) {
            const lenBuf = this.socket.read(4);
            if (!lenBuf) return;

            const len = lenBuf.readUInt32BE();
            if (len > MAX_LENGTH) {
                this.socket.destroy(new Error("max length exceeded"));
                return;
            }

            const body = this.socket.read(len);
            if (!body) {
                this.socket.unshift(lenBuf);
                return;
            }

            let json: string;
            try {
                json = JSON.parse(body);
            } catch (ex) {
                this.socket.destroy(ex);
                return;
            }

            const pushOk = this.push(json);
            if (!pushOk) this.readingPaused = true;
        }
    }

    _read(): void {
        this.readingPaused = false;
        setImmediate(this.onReadable.bind(this));
    }

    _write(obj: any, _: any, cb: (error: Error | undefined) => void): void {
        const json = JSON.stringify(obj);
        const length = Buffer.byteLength(json);

        if (length > MAX_LENGTH) {
            this.socket.destroy(new Error("max length exceeded"));
            return;
        }
        const buffer = Buffer.alloc(4 + length);
        buffer.writeUInt32BE(length, 0);
        buffer.write(json, 4);
        this.socket.write(buffer, cb);
    }
}
