import process from "process";
import path from "path";
import fs from "fs";
import child from "child_process";
import os from "os";
import JSON5 from "json5";
import {
    TurboOptions,
    Turbo,
    Environment,
    Config,
    SessionId,
} from "@turbo/core";

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
function getAllSessionIds(): SessionId[] {
    const folder = getTmpFolder("sessions");
    const files = fs.readdirSync(folder);
    return files.map(f => path.basename(f) as SessionId);
}

function fileNameFromPath(p: string): string {
    return path.basename(p);
}

function cleanPath(p: string): string {
    const cwd = process.cwd();

    const relative = path.relative(cwd, p);
    const isSubDir =
        relative && !relative.startsWith("..") && !path.isAbsolute(relative);

    if (isSubDir) {
        return relative;
    } else {
        return p;
    }
}

function exit(): void {
    process.exit(0);
}

function tryRequire(path: string): any {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(path);

        if (mod.__esModule) {
            return mod;
        } else {
            return { default: mod };
        }
    } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND") {
            throw e;
        }
        return false;
    }
}

function turboRequire(path: string): any {
    let mod = tryRequire(`@turbo/${path}`);
    if (mod) return mod;

    mod = tryRequire(path);
    if (mod) return mod;

    return false;
}

function readFile(path: string): string {
    return fs.readFileSync(path).toString();
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
        getAllSessionIds,
        fileNameFromPath,
        cleanPath,
        require: turboRequire,
        readFile,
        exit,
    };
}

function loadJson(path: string): any {
    const text = fs.readFileSync(path).toString();
    return JSON5.parse(text);
}

const DEFAULT_CONFIG: Config = {
    target: "node",
};

function getConfig(): Config {
    const fileName = "turbo.config.json";
    const home = os.homedir();

    const config: Config = { ...DEFAULT_CONFIG } as Config;

    const homeFile = path.join(home, "." + fileName);
    if (fs.existsSync(homeFile)) {
        const data = loadJson(homeFile);
        Object.assign(config, data);
    }

    let dir = process.cwd();
    const root = path.parse(dir).root;

    while (true) {
        const file = path.join(dir, fileName);
        if (fs.existsSync(file)) {
            const data = loadJson(file);
            Object.assign(config, data);
        }

        if (dir === root) {
            break;
        } else {
            dir = path.join(dir, "..");
        }
    }

    return config;
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
