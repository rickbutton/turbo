import chalk from "chalk";
import { EmitterBase } from "./emitter";

export type LogLevel = "error" | "warn" | "info" | "verbose" | "debug";

export interface LogEvent {
    level: LogLevel;
    msg: string;
}
interface LoggerEvents {
    log: LogEvent;
}

export interface Logger {
    log(msg: string): void;
}

export interface LevelLogger {
    error(msg: string): void;
    warn(msg: string): void;
    info(msg: string): void;
    verbose(msg: string): void;
    debug(msg: string): void;
}

class LoggerImpl extends EmitterBase<LoggerEvents> implements LevelLogger {
    public context = "";

    public error(msg: string): void {
        this.fire("log", { level: "error", msg });
    }
    public warn(msg: string): void {
        this.fire("log", { level: "warn", msg });
    }
    public info(msg: string): void {
        this.fire("log", { level: "info", msg });
    }
    public verbose(msg: string): void {
        this.fire("log", { level: "verbose", msg });
    }
    public debug(msg: string): void {
        this.fire("log", { level: "debug", msg });
    }
}

export const logger = new LoggerImpl();

export function format(log: LogEvent): string {
    switch (log.level) {
        case "error":
            return chalk.red("err] ") + log.msg + "\n";
        case "warn":
            return chalk.yellow("wrn] ") + log.msg + "\n";
        case "info":
            return chalk.blue("nfo] ") + log.msg + "\n";
        case "verbose":
            return chalk.magenta("ver] ") + log.msg + "\n";
        case "debug":
            return chalk.dim("dbg] ") + log.msg + "\n";
    }
}
