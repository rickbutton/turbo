import { Target, TargetEvents, EmitterBase, logger, Turbo } from "@turbo/core";
import child from "child_process";

const NODE_EXIT_REGEX = /Waiting for the debugger to disconnect\.\.\.\n$/;
const NODE_PORT_REGEX = /Debugger listening on ws:\/\/([^:]+):(\d+)/;

// TODO: need to add events for updates to the target
class ManagedScript extends EmitterBase<TargetEvents> implements Target {
    private process: child.ChildProcess | null = null;
    private config: NodeConnectorConfig;
    private turbo: Turbo;

    constructor(config: NodeConnectorConfig, turbo: Turbo) {
        super();
        this.config = config;
        this.turbo = turbo;
    }

    start(): void {
        logger.debug("process: " + (this.process !== null));
        if (this.process === null) {
            this.spawn();
        }
    }
    stop(): void {
        if (this.process !== null) {
            this.process.kill();
            this.process = null;
        }
    }
    get isRunning(): boolean {
        return this.process !== null;
    }
    get pid(): number | null {
        return this.process ? this.process.pid : null;
    }

    private spawn(): void {
        const nodePath = this.config.nodePath || this.turbo.env.nodePath;
        const args = ["--inspect-brk=0", this.config.script];

        logger.info(
            `starting node process ${nodePath} with args ${args.join(" ")}`,
        );
        this.process = child.spawn(nodePath, args);
        this.process.on("exit", this.onExit.bind(this));
        this.process.on("kill", this.onExit.bind(this));

        if (this.process.stdout) {
            this.process.stdout.on("data", (data: any) => {
                this.fire("stdout", data.toString());
            });
        }
        if (this.process.stderr) {
            this.process.stderr.on("data", (data: any) => {
                const str = data.toString();

                if (NODE_EXIT_REGEX.test(str)) {
                    logger.debug("NODE_EXIT_REGEX matched");
                    this.stop();
                } else if (NODE_PORT_REGEX.test(str)) {
                    logger.debug("NODE_PORT_REGEX matched");
                    const matches = str.match(NODE_PORT_REGEX);
                    if (matches) {
                        const host = matches[1];
                        const port = parseInt(matches[2], 10);

                        logger.debug(`node matched ${host}:${port}`);

                        // hacky delay so that node has enough time
                        // to actually bind to the port
                        const timeout = setTimeout(() => {
                            this.fire("started", {
                                interface: { host, port },
                            });
                        }, 100); // TODO: option
                        timeout.unref();
                    }
                }
                this.fire("stderr", str);
            });
        }
    }

    private onExit(): void {
        logger.debug("node onExit");
        this.process = null;
        this.fire("stopped", undefined);
    }
}

export interface NodeConnectorConfig {
    readonly script: string;
    readonly nodePath?: string;
}

export default function node(
    config: NodeConnectorConfig,
    turbo: Turbo,
): Target {
    if (!config.script) {
        throw new Error(`missing script option`);
    }
    return new ManagedScript(config, turbo);
}
