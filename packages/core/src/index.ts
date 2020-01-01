import uuidv4 from "uuid/v4";
import { Emitter } from "./emitter";

declare const __sessionIdTag: unique symbol;
export type SessionId = string & { readonly __tag: typeof __sessionIdTag };

export interface Host {
    readonly nodePath: string;
    readonly scriptPath: string;

    readonly getVar: (name: string) => string | undefined;
    readonly execSync: (command: string) => string;
    readonly getTmpFolder: (context: string) => string;
    readonly getTmpFile: (context: string, name: string) => string;
}

export interface Config {
    target: TargetFactory;
}

export interface StartedEvent {
    interface: {
        host: string;
        port: number;
    };
}
export interface TargetEvents {
    started: StartedEvent;
    stopped: undefined;
    stdout: string;
    stderr: string;
}
export interface Target extends Emitter<TargetEvents> {
    readonly name: string;
    readonly isRunning: boolean;
    readonly start: () => void;
    readonly stop: () => void;
}
export type TargetFactory = (host: Host) => Target;

export interface TurboOptions {
    sessionId?: SessionId;
}
export interface Environment {
    host: Host;
    config: Config;
    options: TurboOptions;
}

export function uuid(): string {
    return uuidv4();
}

export { Emitter, EmitterBase } from "./emitter";
export { logger, format } from "./logger";
export {
    LogEvent,
    LogLevel,
    State,
    TargetConnection,
    TargetConnectionEvents,
    PausedEvent,
    CallFrame,
    SourceLocation,
    CallFrameId,
    ScriptId,
    RemoteObject,
    RemoteException,
    ObjectId,
    Action,
    EvalResponse,
} from "./state";
export { reduce, initialState } from "./reducer";
