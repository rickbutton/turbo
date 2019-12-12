import { createLogger, State, Action } from "@turbo/core";
import { Message, Request, ResponsePayload } from "./shared";
import { BaseClient, BaseClientEvents } from "./baseclient";

const logger = createLogger("client");

interface ClientEvents extends BaseClientEvents {
    sync: State;
}

export class Client extends BaseClient<ClientEvents> {
    public action(action: Action): void {
        this.sendMessage({
            type: "action",
            payload: action,
        });
    }
    public eval(expr: string): Promise<string> {
        const req: Request = {
            type: "eval",
            id: this.generateRequestId(),
            payload: expr,
        };
        return this.sendRequest(req);
    }

    protected handleUnhandledMessage(msg: Message): void {
        if (msg.type === "sync") {
            this.fire("sync", msg.payload.state);
        } else {
            logger.error(`unhandled message with type ${msg.type}`);
        }
    }
    protected handleUnhandledRequest(
        req: Request,
    ): Promise<ResponsePayload | undefined> {
        logger.error(`unhandled request with type ${req.type}`);
        return Promise.resolve(undefined);
    }
}
