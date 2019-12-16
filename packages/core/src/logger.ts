import chalk from "chalk";

const log = console.log;

export class Logger {
    private context: string;
    constructor(context: string) {
        this.context = context;
    }

    public error(msg: string): void {
        log(chalk.red("[err] ") + msg);
    }
    public warn(msg: string): void {
        log(chalk.yellow("[wrn] ") + msg);
    }
    public info(msg: string): void {
        log(chalk.blue("[nfo] ") + msg);
    }
    public verbose(msg: string): void {
        log(chalk.cyan("[ver] ") + msg);
    }
    public debug(msg: string): void {
        log(chalk.magenta("[dbg] ") + msg);
    }
}

export function createLogger(context: string): Logger {
    return new Logger(context);
}
