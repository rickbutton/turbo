import process from "process";
import path from "path";
import fs from "fs";
import child from "child_process";
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
    };
}

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

export function getTurbo(options: TurboOptions): Turbo {
    const env = getEnvironment();
    const config = getConfig();
    return {
        env,
        config,
        options,
    };
}
