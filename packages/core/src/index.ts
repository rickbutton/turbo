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
    readonly cleanPath: (path: string) => string;
    readonly exit: () => void;
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
    shell: ShellFactory;
    layout?: Layout;
}

export interface Shell {
    start(id: SessionId, layout: Layout, turbo: Turbo): void;
    getSessionId(): SessionId | undefined;
}
export type ShellFactory = (env: Environment) => Shell;

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

export function getCurrentSessionId(turbo: Turbo): SessionId | undefined {
    if (turbo.options.sessionId) {
        return turbo.options.sessionId;
    }

    const shell = turbo.config.shell(turbo.env);
    const shellId = shell.getSessionId();
    if (shellId) {
        return shellId;
    }

    const ids = turbo.env.getAllSessionIds();
    if (ids.length === 1) {
        return ids[0];
    }

    return undefined;
}

export const DEFAULT_SESSION_ID = "turbo" as SessionId;
export function generateSessionId(turbo: Turbo): SessionId {
    const sessionIds = turbo.env.getAllSessionIds();

    const standardIds = sessionIds.filter(id => /^turbo(-.+)?$/.test(id));

    if (!standardIds.includes(DEFAULT_SESSION_ID)) {
        return DEFAULT_SESSION_ID;
    } else {
        const id = standardIds.length + 1;
        return `${DEFAULT_SESSION_ID}-${id}` as SessionId;
    }
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
    RawBreakpointMetadata,
    BreakLocation,
    PausedEvent,
    ScriptParsedEvent,
    BreakpointResolvedEvent,
    BreakpointsEnabledUpdatedEvent,
    CallFrameId,
    ScriptId,
    ObjectId,
    BreakpointId,
    RawBreakpointId,
    EvalResponse,
    GetPropertiesResponse,
    Action,
    ActionType,
} from "./state";
export { canonicalizeUrl } from "./normalize";
export { makeStore, Store } from "./reducer";
export * from "./net";
