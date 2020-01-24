import ChromeRemoteInterface from "chrome-remote-interface";
import { Client, Protocol, Factory } from "chrome-remote-interface";
import {
    logger,
    canonicalizeUrl,
    TargetConnection,
    TargetConnectionEvents,
    EmitterBase,
    CallFrame,
    CallFrameId,
    ScriptId,
    RemoteObject,
    RemoteObjectProperty,
    ObjectId,
    RemoteException,
    EvalResponse,
    GetPropertiesResponse,
    SourceLocation,
    BreakpointId,
    BreakLocation,
    Script,
    Breakpoint,
    UnverifiedBreakpoint,
} from "./index";

const CDP = (ChromeRemoteInterface as unknown) as Factory;

function toSourceLocation(
    location: Protocol.Debugger.Location,
): SourceLocation {
    return {
        scriptId: location.scriptId as ScriptId,
        line: location.lineNumber,
        column: location.columnNumber,
    };
}

function toBreakLocation(
    location: Protocol.Debugger.BreakLocation,
): BreakLocation {
    return {
        scriptId: location.scriptId as ScriptId,
        line: location.lineNumber,
        column: location.columnNumber,
        type: location.type,
    };
}

function toScript(script: Protocol.Debugger.ScriptParsedEvent): Script {
    return {
        id: script.scriptId as ScriptId,
        url: canonicalizeUrl(script.url),
        startLine: script.startLine,
        startColumn: script.startColumn,
        endLine: script.endLine,
        endColumn: script.endColumn,
        hash: script.hash,
        isLiveEdit: script.isLiveEdit,
        sourceMapUrl: script.sourceMapURL,
        hasSourceUrl: script.hasSourceURL,
        isModule: script.isModule,
        length: script.length,
    };
}

function toCallFrame(callFrame: Protocol.Debugger.CallFrame): CallFrame {
    return {
        id: callFrame.callFrameId as CallFrameId,
        functionName: callFrame.functionName,
        location: toSourceLocation(callFrame.location),
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

function toRemoteObjectProperty(
    obj: Protocol.Runtime.PropertyDescriptor,
): RemoteObjectProperty {
    return {
        name: obj.name,
        value: obj.value ? toRemoteObject(obj.value) : { type: "undefined" },
        writable: obj.writable || false,
        get: obj.get ? toRemoteObject(obj.get) : undefined,
        set: obj.set ? toRemoteObject(obj.set) : undefined,
        configurable: obj.configurable,
        enumerable: obj.enumerable,
        isOwn: obj.isOwn || false,
        symbol: obj.symbol ? toRemoteObject(obj.symbol) : undefined,
    };
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

class V8TargetConnection extends EmitterBase<TargetConnectionEvents>
    implements TargetConnection {
    private client: Client;
    private initialBreaks: UnverifiedBreakpoint[];

    private callFrames: Protocol.Debugger.CallFrame[] | null = null;
    private lastConditions: Map<BreakpointId, string | undefined> = new Map();

    private enabled = false;
    private needsResume = false;
    private _breakpointsEnabled = false;

    public get breakpointsEnabled(): boolean {
        return this._breakpointsEnabled;
    }

    constructor(client: Client, initialBreaks: UnverifiedBreakpoint[] = []) {
        super();
        this.client = client;
        this.initialBreaks = initialBreaks;
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
            this.fire("resumed", undefined);
        });
        this.client.Debugger.scriptParsed(event => {
            const script = toScript(event);
            this.fire("scriptParsed", { script });
        });
        this.client.Debugger.breakpointResolved(event => {
            const id = event.breakpointId as BreakpointId;
            const breakpoint: Breakpoint = {
                verified: true,
                location: toSourceLocation(event.location),
                id,
                condition: this.lastConditions.get(id),
                url: "",
                normalizedUrl: "",
            };

            this.fire("breakpointResolved", { breakpoint });
        });

        // TODO: set breakpoints
    }

    public async enable(): Promise<void> {
        await this.client.Debugger.enable({});
        await this.client.Debugger.setBreakpointsActive({ active: true });
        this._breakpointsEnabled = false;
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
    async setBreakpoint(
        location: SourceLocation,
        condition?: string,
    ): Promise<void> {
        logger.debug("v8 setBreakpoint");
        const { breakpointId } = await this.client.Debugger.setBreakpoint({
            location: {
                scriptId: location.scriptId,
                lineNumber: location.line,
                columnNumber: location.column,
            },
            condition,
        });
        this.lastConditions.set(breakpointId as BreakpointId, condition);
    }
    async removeBreakpoint(id: BreakpointId): Promise<void> {
        await this.client.Debugger.removeBreakpoint({ breakpointId: id });
    }
    async enableBreakpoints(): Promise<void> {
        await this.client.Debugger.setBreakpointsActive({ active: true });
        this._breakpointsEnabled = true;
    }
    async disableBreakpoints(): Promise<void> {
        await this.client.Debugger.setBreakpointsActive({ active: false });
        this._breakpointsEnabled = false;
    }
    async getPossibleBreakpointLocations(
        id: ScriptId,
    ): Promise<BreakLocation[]> {
        const { locations } = await this.client.Debugger.getPossibleBreakpoints(
            {
                start: {
                    scriptId: id,
                    lineNumber: 0,
                },
            },
        );

        return locations.map(l => toBreakLocation(l));
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

    async getProperties(objectId: ObjectId): Promise<GetPropertiesResponse> {
        const {
            result,
            exceptionDetails,
        } = await this.client.Runtime.getProperties({
            objectId,
            ownProperties: true,
        });
        if (!exceptionDetails) {
            return {
                error: false,
                value: result.map(toRemoteObjectProperty),
            };
        } else {
            return {
                error: true,
                value: toRemoteException(exceptionDetails),
            };
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
    logger.verbose("connecting cdp");
    const client = await CDP({ host, port });
    logger.verbose("connected to cdp");
    const conn = new V8TargetConnection(client);
    logger.verbose("waiting for cdp setup");
    await conn.setup();
    logger.verbose("cdp is setup");
    return conn;
}
