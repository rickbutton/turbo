import ChromeRemoteInterface from "chrome-remote-interface";
import { Client, Protocol, Factory } from "chrome-remote-interface";
import {
    logger,
    TargetConnection,
    TargetConnectionEvents,
    EmitterBase,
    CallFrame,
    CallFrameId,
    ScriptId,
    RemoteObject,
    ObjectId,
    RemoteException,
    EvalResponse,
} from "@turbo/core";

const CDP = (ChromeRemoteInterface as unknown) as Factory;

function toCallFrame(callFrame: Protocol.Debugger.CallFrame): CallFrame {
    return {
        id: callFrame.callFrameId as CallFrameId,
        functionName: callFrame.functionName,
        location: {
            scriptId: callFrame.location.scriptId as ScriptId,
            line: callFrame.location.lineNumber,
            column: callFrame.location.columnNumber,
        },
    };
}

function toRemoteObject(obj: Protocol.Runtime.RemoteObject): RemoteObject {
    if (obj.type === "string") {
        return { type: "string", value: obj.value };
    } else if (obj.type === "number") {
        return {
            type: "number",
            value: obj.value,
            description: obj.description || "",
        };
    } else if (obj.type === "boolean") {
        return { type: "boolean", value: obj.value };
    } else if (obj.type === "symbol") {
        return {
            type: "symbol",
            description: obj.description || "",
            objectId: (obj.objectId || "") as ObjectId,
        };
    } else if (obj.type === "bigint") {
        return {
            type: "bigint",
            value: obj.unserializableValue || "",
            description: obj.description || "",
        };
    } else if (obj.type === "undefined") {
        return { type: "undefined" };
    } else if (obj.type === "function") {
        return {
            type: "function",
            className: obj.className || "",
            description: obj.description || "",
            objectId: (obj.objectId || "") as ObjectId,
        };
    } else if (obj.type === "object") {
        return {
            type: "object",
            className: obj.className || "",
            subtype: obj.subtype || "",
            description: obj.description || "",
            objectId: (obj.objectId || "") as ObjectId,
        };
    } else {
        throw new Error("unknown v8 type: " + obj.type);
    }
}

function toRemoteException(
    obj: Protocol.Runtime.ExceptionDetails,
): RemoteException {
    return {
        text: obj.text,
        line: obj.lineNumber,
        column: obj.columnNumber,
        scriptId: obj.scriptId as ScriptId,
        url: obj.url,
        exception: obj.exception ? toRemoteObject(obj.exception) : undefined,
    };
}

class V8TargetConnection extends EmitterBase<TargetConnectionEvents> {
    private client: Client;

    private callFrames: Protocol.Debugger.CallFrame[] | null = null;

    private enabled = false;
    private needsResume = false;

    constructor(client: Client) {
        super();
        this.client = client;
    }

    public async setup(): Promise<void> {
        let first = true;

        this.client.on("disconnect", () => {
            logger.debug("v8 disconnect event");
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

                if (this.enabled) {
                    logger.debug("resuming after first break");
                    this.client.Debugger.resume();
                } else {
                    logger.debug("deferring resume until enabled");
                    this.needsResume = true;
                }
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
    }

    public async enable(): Promise<void> {
        await this.client.Debugger.enable({});
        await this.client.Runtime.runIfWaitingForDebugger();
        this.enabled = true;
        if (this.needsResume) {
            logger.debug("doing deferred resume");
            await this.client.Debugger.resume();
            this.needsResume = false;
        }
    }

    async resume(): Promise<void> {
        logger.debug("v8 resume");
        if (this.callFrames) {
            await this.client.Debugger.resume();
        }
    }
    async pause(): Promise<void> {
        logger.debug("v8 pause");
        if (!this.callFrames) {
            await this.client.Debugger.pause();
        }
    }
    async stepInto(): Promise<void> {
        logger.debug("v8 stepInto");
        if (this.callFrames) {
            await this.client.Debugger.stepInto({});
        }
    }
    async stepOut(): Promise<void> {
        logger.debug("v8 stepOut");
        if (this.callFrames) {
            await this.client.Debugger.stepOut();
        }
    }
    async stepOver(): Promise<void> {
        logger.debug("v8 stepOver");
        if (this.callFrames) {
            await this.client.Debugger.stepOver();
        }
    }

    async eval(script: string, id: CallFrameId): Promise<EvalResponse> {
        logger.debug("v8 eval received: " + script);
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
                return {
                    error: true,
                    value: toRemoteException(exceptionDetails),
                };
            } else {
                return {
                    error: false,
                    value: toRemoteObject(result),
                };
            }
        } else {
            return { error: true, value: `invalid call frame: ${id}` };
        }
    }

    async getScriptSource(scriptId: ScriptId): Promise<string> {
        // TODO: wasm?
        const { scriptSource } = await this.client.Debugger.getScriptSource({
            scriptId,
        });
        return scriptSource;
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
