import * as net from "net";
import { JsonSocket, SessionId, EmitterBase } from "@jug/core";

interface ClientEvents {
    close: boolean;
    data: any;
    error: Error;
    ready: void;
}
export class Client extends EmitterBase<ClientEvents> {
    private sessionId: SessionId;
    private client: JsonSocket = this.createClient();

    constructor(sessionId: SessionId) {
        super();
        this.sessionId = sessionId;
    }

    public connect(): void {
        this.client.connect(`/tmp/jug-sesssions/${this.sessionId}`);
    }

    private createClient(): JsonSocket {
        const client = new JsonSocket(new net.Socket());

        client.on("close", (hadError: boolean) => this.fire("close", hadError));
        client.on("data", (data: Buffer | string) => this.fire("data", data));
        client.on("error", (error: Error) => this.fire("error", error));
        client.on("ready", () => this.fire("ready", undefined));

        return client;
    }
}
