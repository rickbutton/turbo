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
} from "./index";
import { RawBreakpointId, ResolvedBreakpoint, Scope } from "./state";

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
        rawUrl: script.url,
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

function toScope(scope: Protocol.Debugger.Scope): Scope {
    return {
        type: scope.type,
        object: toRemoteObject(scope.object),
        name: scope.name,
        startLocation: scope.startLocation
            ? toSourceLocation(scope.startLocation)
            : undefined,
        endLocation: scope.endLocation
            ? toSourceLocation(scope.endLocation)
            : undefined,
    };
}

function toCallFrame(callFrame: Protocol.Debugger.CallFrame): CallFrame {
    return {
        id: callFrame.callFrameId as CallFrameId,
        functionName: callFrame.functionName,
        location: toSourceLocation(callFrame.location),
        scopes: callFrame.scopeChain.map(s => toScope(s)),
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
    private scripts: Map<ScriptId, Script> = new Map();
    private breakpoints: Map<BreakpointId, Breakpoint> = new Map();

    private callFrames: Protocol.Debugger.CallFrame[] | null = null;

    private enabled = false;
    private needsResume = false;
    private _breakpointsEnabled = false;

    public get breakpointsEnabled(): boolean {
        return this._breakpointsEnabled;
    }

    constructor(client: Client, breakpoints: Breakpoint[]) {
        super();
        this.client = client;

        for (const breakpoint of breakpoints) {
            this.breakpoints.set(breakpoint.id, {
                ...breakpoint,
                raw: undefined,
            });
        }
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
            logger.verbose(`v8 script parsed ${script.id} ${script.rawUrl}`);

            this.scripts.set(script.id, script);
            this.fire("scriptParsed", { script });
        });
        this.client.Debugger.breakpointResolved(e => {
            logger.verbose(`v8 breakpoint resolved ${e.breakpointId}`);
            const location = toSourceLocation(e.location);

            const script = this.scripts.get(location.scriptId);
            if (script) {
                const matches = Array.from(this.breakpoints.values()).filter(
                    b =>
                        b.rawUrl === script.rawUrl &&
                        b.line === location.line &&
                        (!b.column || b.column === location.column),
                );

                if (matches.length === 1) {
                    const match = matches[0];
                    logger.verbose(`found breakpoint match: ${match.id}`);

                    const breakpoint = {
                        ...match,
                        raw: {
                            id: e.breakpointId as RawBreakpointId,
                            location,
                        },
                        line: location.line,
                        column: location.column,
                    };
                    this.breakpoints.set(breakpoint.id, breakpoint);
                    this.fire("breakpointResolved", { breakpoint });
                } else {
                    logger.error(
                        `unexpected number of breakpoint matches during resolve: ${matches.length}`,
                    );
                }
            } else {
                logger.error(
                    `couldn't get script during breakpoint resolve ${location.scriptId}`,
                );
            }
        });
    }

    public async enable(): Promise<void> {
        await this.client.Debugger.enable({});

        await this.client.Debugger.setBreakpointsActive({ active: true });
        this._breakpointsEnabled = false;
        for (const breakpoint of this.breakpoints.values()) {
            await this.setBreakpoint(breakpoint);
        }

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
    async setBreakpoint(breakpoint: Breakpoint): Promise<void> {
        logger.debug(
            `v8 setBreakpoint ${breakpoint.rawUrl} ${breakpoint.line}:${breakpoint.column}`,
        );
        const {
            breakpointId,
            locations,
        } = await this.client.Debugger.setBreakpointByUrl({
            url: breakpoint.rawUrl,
            lineNumber: breakpoint.line,
            columnNumber: breakpoint.column,
            condition: breakpoint.condition,
        });

        logger.debug(`new breakpoint id: ${breakpointId}`);
        logger.debug(JSON.stringify(locations, null, 4));

        if (locations.length > 0) {
            const location = toSourceLocation(locations[0]);
            const newBreakpoint: ResolvedBreakpoint = {
                ...breakpoint,
                raw: {
                    id: breakpointId as RawBreakpointId,
                    location,
                },
                line: location.line,
                column: location.column,
            };

            this.fire("breakpointResolved", { breakpoint: newBreakpoint });

            this.breakpoints.set(newBreakpoint.id, newBreakpoint);
        }
    }
    async removeBreakpoint(id: BreakpointId): Promise<void> {
        const breakpoint = this.breakpoints.get(id);
        this.breakpoints.delete(id);

        if (breakpoint && breakpoint.raw) {
            await this.client.Debugger.removeBreakpoint({
                breakpointId: breakpoint.raw.id,
            });
        } else if (breakpoint) {
            logger.error(
                `failed to remove breakpoint ${breakpoint.id}, not resolved`,
            );
        } else {
            logger.error(`failed to remove breakpoint ${id}, unknown id`);
        }
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
    breakpoints: Breakpoint[],
): Promise<TargetConnection> {
    logger.verbose("connecting cdp");
    const client = await CDP({ host, port });
    logger.verbose("connected to cdp");
    const conn = new V8TargetConnection(client, breakpoints);
    logger.verbose("waiting for cdp setup");
    await conn.setup();
    logger.verbose("cdp is setup");
    return conn;
}
