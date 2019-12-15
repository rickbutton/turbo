import * as ChromeRemoteInterface from "chrome-remote-interface";
import {
    createLogger,
    TargetConnection,
    TargetConnectionEvents,
    EmitterBase,
} from "@turbo/core";

const logger = createLogger("v8");
const CDP = ChromeRemoteInterface as any;

type CDPClient = any;

class V8TargetConnection extends EmitterBase<TargetConnectionEvents> {
    private client: CDPClient;

    constructor(client: CDPClient) {
        super();
        this.client = client;

        client.on("disconnect", () => {
            this.fire("close", undefined);
        });
        client.on("error", (error: any) => {
            logger.error(error.toString());
        });
    }

    async eval(script: string): Promise<string> {
        const { result, exceptionDetails } = await this.client.Runtime.evaluate(
            {
                expression: `(${script})`,
            },
        );
        if (exceptionDetails) {
            return JSON.stringify(exceptionDetails);
        } else {
            return JSON.stringify(result);
        }
    }
}

export async function connect(
    host: string,
    port: number,
): Promise<TargetConnection> {
    const client = await CDP({ host, port });
    return new V8TargetConnection(client);
}
