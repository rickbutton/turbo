import uuidv4 from "uuid/v4";
import { Emitter } from "./emitter";

export const LOGO =
    "   __             __        \n" +
    "  / /___  _______/ /_  ____ \n" +
    " / __/ / / / ___/ __ \\/ __ \\\n" +
    "/ /_/ /_/ / /  / /_/ / /_/ /\n" +
    "\\__/\\__,_/_/  /_.___/\\____/\n ";

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
export {
    Logger,
    LevelLogger,
    logger,
    format,
    LogEvent,
    LogLevel,
} from "./logger";
export {
    State,
    TargetConnection,
    TargetConnectionEvents,
    CallFrame,
    SourceLocation,
    Script,
    RemoteObject,
    RemoteObjectProperty,
    RemoteException,
    Breakpoint,
    UnverifiedBreakpoint,
    VerifiedBreakpoint,
    BreakLocation,
    PausedEvent,
    ScriptParsedEvent,
    BreakpointResolvedEvent,
    BreakpointsEnabledUpdatedEvent,
    CallFrameId,
    ScriptId,
    ObjectId,
    BreakpointId,
    UnverifiedBreakpointId,
    EvalResponse,
    GetPropertiesResponse,
    Action,
    ActionType,
} from "./state";
export { canonicalizeUrl } from "./normalize";
export { makeStore, Store } from "./reducer";
export * from "./net";
