import uuidv4 from "uuid/v4";
import { Emitter } from "./emitter";

declare const __sessionIdTag: unique symbol;
export type SessionId = string & { readonly __tag: typeof __sessionIdTag };

export interface Environment {
    readonly nodePath: string;
    readonly scriptPath: string;

    readonly getVar: (name: string) => string | undefined;
    readonly execSync: (command: string) => string;
    readonly getTmpFolder: (context: string) => string;
    readonly getTmpFile: (context: string, name: string) => string;
    readonly getAllSessionIds: () => SessionId[];
}

export interface Layout {
    readonly windows: Window[];
}

export interface Window {
    readonly name: string;
    readonly panes: Pane[];
}

interface ComponentPane {
    readonly type: "component";
    readonly component: string;
}
interface ExecPane {
    readonly type: "exec";
    readonly command: string;
}
interface ShellPane {
    readonly type: "shell";
}

export type Pane = ComponentPane | ExecPane | ShellPane;

export interface Config {
    target: TargetFactory;
    layout?: Layout;
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
export type TargetFactory = (env: Environment) => Target;

export interface TurboOptions {
    sessionId?: SessionId;
}
export interface Turbo {
    env: Environment;
    config: Config;
    options: TurboOptions;
}

export function uuid(): string {
    return uuidv4();
}

export { Emitter, EmitterBase } from "./emitter";
export { logger, format, LogEvent, LogLevel } from "./logger";
export {
    State,
    TargetConnection,
    TargetConnectionEvents,
    PausedEvent,
    CallFrame,
    SourceLocation,
    CallFrameId,
    ScriptId,
    RemoteObject,
    RemoteObjectProperty,
    RemoteException,
    ObjectId,
    Action,
    EvalResponse,
    GetPropertiesResponse,
} from "./state";
export { StateReducer } from "./reducer";
