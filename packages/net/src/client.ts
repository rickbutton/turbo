import { createLogger, State } from "@turbo/core";
import { Message, Request } from "./shared";
import { BaseClient, BaseClientEvents } from "./baseclient";

const logger = createLogger("client");

interface ClientEvents extends BaseClientEvents {
    sync: State;
}

export class Client extends BaseClient<ClientEvents> {
    protected handleUnhandledMessage(msg: Message): void {
        if (msg.type === "sync") {
            this.fire("sync", msg.payload.state);
        } else {
            logger.error(`unhandled message with type ${msg.type}`);
        }
    }
    protected handleUnhandledRequest(req: Request): string | undefined {
        logger.error(`unhandled request with type ${req.type}`);
        return undefined;
    }
}
