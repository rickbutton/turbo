import * as process from "process";
import * as child from "child_process";
import * as path from "path";
import * as fs from "fs";

declare const __sessionIdTag: unique symbol;
export type SessionId = string & { __tag: typeof __sessionIdTag };

export interface Environment {
    readonly nodePath: string;
    readonly scriptPath: string;

    readonly getVar: (name: string) => string | undefined;
    readonly execSync: (command: string) => string;
}

function getVar(name: string): string | undefined {
    console.log(process.env);
    return process.env ? process.env[name] : undefined;
}

function execSync(command: string): string {
    return child.execSync(command).toString();
}

function getEnvironment(): Environment {
    const nodePath = process.argv[0];
    const scriptPath = process.argv[1];
    return {
        nodePath,
        scriptPath,
        getVar,
        execSync,
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

type EmitterCallback<T> = (event: T) => void;
type EmitterMap<T> = { [K in keyof T]: Set<EmitterCallback<T[K]>> };

export interface TargetEvents {
    started: undefined;
    stopped: undefined;
}
export interface Target extends Emitter<TargetEvents> {
    // TODO: add event handler on/off here
    readonly name: string;
    readonly isRunning: boolean;
    readonly start: () => void;
    readonly stop: () => void;
}
export type TargetFactory = (env: Environment) => Target;

export interface Emitter<T> {
    on<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void;
    off<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void;
    fire<N extends keyof T>(name: N, event: T[N]): void;
}

export abstract class EmitterBase<T> implements Emitter<T> {
    private map: EmitterMap<T> = {} as EmitterMap<T>;

    on<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void {
        if (this.map[name]) {
            this.map[name].add(func);
        } else {
            this.map[name] = new Set([func]);
        }
    }
    off<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void {
        if (this.map[name]) {
            this.map[name].delete(func);

            if (this.map[name].size === 0) {
                delete this.map[name];
            }
        }
    }
    fire<N extends keyof T>(name: N, event: T[N]): void {
        if (this.map[name]) {
            for (const func of this.map[name]) {
                func(event);
            }
        }
    }
}

function validateConfig(config: Config): void {
    if (!config.target) {
        throw new Error("must specify a target in jug config");
    }
}

function getConfig(basePath?: string): Config {
    const dir = basePath || process.cwd();
    const parsed = path.parse(dir);

    const configFileName = "jug.config.js";

    const configPath = path.join(dir, configFileName);

    if (fs.existsSync(configPath)) {
        const config = require(configPath) as Config;
        validateConfig(config);
        return config;
    } else if (dir !== parsed.root) {
        return getConfig(path.resolve(dir, ".."));
    } else {
        throw new Error("unable to find jug.config.js");
    }
}

export interface Jug {
    env: Environment;
    config: Config;
}

export function getJug(): Jug {
    const env = getEnvironment();
    const config = getConfig();
    return {
        env,
        config,
    };
}

export { JsonSocket } from "./jsonsocket";
export { createLogger } from "./logger";
