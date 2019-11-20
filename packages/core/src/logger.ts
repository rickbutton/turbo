import * as _chalk from "chalk";

const log = console.log;

class Logger {
    private context: string;
    constructor(context: string) {
        this.context = context;
    }

    public error(msg: string): void {
        log(msg);
    }
    public warn(msg: string): void {
        log(msg);
    }
    public info(msg: string): void {
        log(msg);
    }
    public verbose(msg: string): void {
        log(msg);
    }
    public debug(msg: string): void {
        log(msg);
    }
}

export function createLogger(context: string): Logger {
    return new Logger(context);
}
