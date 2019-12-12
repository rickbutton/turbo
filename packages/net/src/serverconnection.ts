import {
    Action,
    SessionId,
    State,
    createLogger,
    TargetConnection,
} from "@turbo/core";
import { ClientId, Request, Message, ResponsePayload } from "./shared";
import { BaseClient, BaseClientEvents, ClientSocket } from "./baseclient";

const logger = createLogger("serverconnection");

interface Selectors {
    currentConnection(): TargetConnection | null;
}

interface ConnectionEvents extends BaseClientEvents {
    action: Action;
}
export class ServerConnection extends BaseClient<ConnectionEvents> {
    public readonly id: ClientId;
    private selectors: Selectors;
    constructor(
        id: ClientId,
        sessionId: SessionId,
        socket: ClientSocket,
        selectors: Selectors,
    ) {
        super({
            type: "unmanaged",
            sessionId,
            socket,
            connected: true,
            reconnect: false,
        });
        this.id = id;
        this.selectors = selectors;
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
        if (msg.type === "action") {
            this.fire("action", msg.payload);
        } else {
            logger.error(`unhandled message with type ${msg.type}`);
        }
    }
    protected handleUnhandledRequest(
        req: Request,
    ): Promise<ResponsePayload | undefined> {
        if (req.type === "eval") {
            const connection = this.selectors.currentConnection();
            if (connection) {
                return connection.eval(req.payload);
            } else {
                return Promise.resolve("unable to evaluate, no connection");
            }
        } else {
            logger.error(`unhandled request with type ${req.type}`);
            return Promise.resolve(undefined);
        }
    }
}
