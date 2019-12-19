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
class Logger extends EmitterBase<LoggerEvents> {
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

export const logger = new Logger();

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
