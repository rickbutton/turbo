import * as ChromeRemoteInterface from "chrome-remote-interface";
import { Client, Protocol, Factory } from "chrome-remote-interface";
import {
    createLogger,
    TargetConnection,
    TargetConnectionEvents,
    EmitterBase,
    CallFrame,
    CallFrameId,
} from "@turbo/core";

const logger = createLogger("v8");

const CDP = (ChromeRemoteInterface as unknown) as Factory;

function toCallFrame(callFrame: Protocol.Debugger.CallFrame): CallFrame {
    return {
        id: callFrame.callFrameId as CallFrameId,
        functionName: callFrame.functionName,
    };
}

class V8TargetConnection extends EmitterBase<TargetConnectionEvents> {
    private client: Client;

    private callFrames: Protocol.Debugger.CallFrame[] | null = null;

    constructor(client: Client) {
        super();
        this.client = client;
    }

    public async setup(): Promise<void> {
        let first = true;

        this.client.on("disconnect", () => {
            this.fire("close", undefined);
        });
        this.client.on("error", (error: any) => {
            logger.error(error.toString());
        });

        this.client.Debugger.paused(event => {
            // TODO: allow configuration option to check for first break or not
            if (first) {
                first = false;
                logger.debug("v8 first break received");
                this.client.Debugger.resume();
            } else {
                logger.debug("v8 target paused");
                this.callFrames = event.callFrames;
                this.fire("paused", {
                    callFrames: event.callFrames.map(toCallFrame),
                });
            }
        });
        this.client.Debugger.resumed(() => {
            this.callFrames = null;
        });
        this.client.Runtime.executionContextDestroyed(() => {
            logger.debug("v8 Runtime.executionContextDestroyed");
            this.client.close();
        });

        await this.client.Debugger.enable({});
        await this.client.Runtime.runIfWaitingForDebugger();
    }

    async resume(): Promise<void> {
        if (this.callFrames) {
            await this.client.Debugger.resume();
        }
    }
    async pause(): Promise<void> {
        if (!this.callFrames) {
            await this.client.Debugger.pause();
        }
    }

    async eval(script: string, id: CallFrameId): Promise<string> {
        const frame = this.findCallFrame(id);

        if (frame) {
            const {
                result,
                exceptionDetails,
            } = await this.client.Debugger.evaluateOnCallFrame({
                expression: `(${script})`,
                callFrameId: frame.callFrameId,
            });
            if (exceptionDetails) {
                return JSON.stringify(exceptionDetails);
            } else {
                return JSON.stringify(result);
            }
        } else {
            return "Invalid call frame ID";
        }
    }

    public async close(): Promise<void> {
        return await this.client.close();
    }

    private findCallFrame(id: CallFrameId): Protocol.Debugger.CallFrame | null {
        if (this.callFrames) {
            return this.callFrames.find(f => f.callFrameId === id) || null;
        } else {
            return null;
        }
    }
}

export async function connect(
    host: string,
    port: number,
): Promise<TargetConnection> {
    const client = await CDP({ host, port });
    const conn = new V8TargetConnection(client);
    await conn.setup();
    return conn;
}
