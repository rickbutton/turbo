import process from "process";
import child from "child_process";
import path from "path";
import fs from "fs";
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
}

function getVar(name: string): string | undefined {
    return process.env ? process.env[name] : undefined;
}

function execSync(command: string): string {
    return child.execSync(command).toString();
}

function ensureFolderExists(folder: string): void {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
}
function getTmpFolder(context: string): string {
    const folder = `/tmp/turbo/${context}`;
    ensureFolderExists(folder);
    return folder;
}
function getTmpFile(context: string, name: string): string {
    const folder = getTmpFolder(context);
    return path.join(folder, name);
}

function getEnvironment(): Environment {
    const nodePath = process.argv[0];
    const scriptPath = process.argv[1];
    return {
        nodePath,
        scriptPath,
        getVar,
        execSync,
        getTmpFolder,
        getTmpFile,
    };
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

function validateConfig(config: Config): void {
    if (!config.target) {
        throw new Error("must specify a target in turbo config");
    }
}

function getConfig(basePath?: string): Config {
    const dir = basePath || process.cwd();
    const parsed = path.parse(dir);

    const configFileName = "turbo.config.js";

    const configPath = path.join(dir, configFileName);

    if (fs.existsSync(configPath)) {
        const config = require(configPath) as Config;
        validateConfig(config);
        return config;
    } else if (dir !== parsed.root) {
        return getConfig(path.resolve(dir, ".."));
    } else {
        throw new Error("unable to find turbo.config.js");
    }
}

export interface TurboOptions {
    sessionId?: SessionId;
}
export interface Turbo {
    env: Environment;
    config: Config;
    options: TurboOptions;
}

export function getTurbo(options: TurboOptions): Turbo {
    const env = getEnvironment();
    const config = getConfig();
    return {
        env,
        config,
        options,
    };
}

export function uuid(): string {
    return uuidv4();
}

export { Emitter, EmitterBase } from "./emitter";
export { JsonSocket } from "./jsonsocket";
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
    RemoteException,
    ObjectId,
    Action,
    EvalResponse,
} from "./state";
export { StateReducer } from "./reducer";
