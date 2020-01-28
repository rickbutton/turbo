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
    readonly require: (path: string) => any;
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

interface Options {
    [key: string]: any;
}
type TargetConfig = string | [string, Options];
type ShellConfig = string | [string, Options];
export interface Config {
    target: TargetConfig;
    shell: ShellConfig;
    layout?: Layout;
}

export type ShellFactory = (options: Options, turbo: Turbo) => Shell;
export interface Shell {
    start(id: SessionId, layout: Layout, turbo: Turbo): void;
    getSessionId(): SessionId | undefined;
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
    readonly isRunning: boolean;
    readonly start: () => void;
    readonly stop: () => void;
}
export type Connector = (options: Options, turbo: Turbo) => Target;

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

    const shell = createShell(turbo);
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

export function resolvePlugin<T>(turbo: Turbo, type: string, name: string): T {
    const shorthand = `${type}-${name}`;
    let mod = turbo.env.require(shorthand);
    if (mod) return mod.default;

    mod = turbo.env.require(name);
    if (mod) return mod.default;

    throw new Error(`unable to resolve plugin ${type}-${name}`);
}
export function createTarget(turbo: Turbo): Target {
    const config = turbo.config.target;
    const name = Array.isArray(config) ? config[0] : config;
    const options = Array.isArray(config) ? config[1] : {};

    const connector = resolvePlugin<Connector>(turbo, "connector", name);

    return connector(options, turbo);
}

export function createShell(turbo: Turbo): Shell {
    const config = turbo.config.shell;
    const name = Array.isArray(config) ? config[0] : config;
    const options = Array.isArray(config) ? config[1] : {};

    const shell = resolvePlugin<ShellFactory>(turbo, "shell", name);

    return shell(options, turbo);
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
