import {
    Target,
    TargetEvents,
    Environment,
    TargetFactory,
    EmitterBase,
    createLogger,
} from "@turbo/core";
import * as child from "child_process";

const logger = createLogger("connector-node");

// need to add events for updates to the target
class ManagedScript extends EmitterBase<TargetEvents> implements Target {
    private process: child.ChildProcess | null = null;
    private config: NodeConnectorConfig;
    private env: Environment;

    constructor(config: NodeConnectorConfig, env: Environment) {
        super();
        this.config = config;
        this.env = env;
    }

    get name(): string {
        return this.config.name || "node";
    }
    start(): void {
        if (this.process === null) {
            this.spawn();
        }
    }
    stop(): void {
        if (this.process !== null) {
            this.process.kill();
        }
    }
    get isRunning(): boolean {
        return this.process !== null;
    }
    get pid(): number | null {
        return this.process ? this.process.pid : null;
    }

    private spawn(): void {
        const nodePath = this.config.nodePath || this.env.nodePath;
        const args = ["--inspect-brk", this.config.script];

        logger.info(
            `starting node process ${nodePath} with args ${args.join(" ")}`,
        );
        this.process = child.spawn(nodePath, args);
        this.process.on("exit", this.onExit.bind(this));
        this.process.on("kill", this.onExit.bind(this));

        if (this.process.stdout) {
            this.process.stdout.on("data", (data: any) => {
                this.fire("data", data.toString());
            });
        }
        if (this.process.stderr) {
            this.process.stderr.on("data", (data: any) => {
                if (
                    /Waiting for the debugger to disconnect\.\.\.\n$/.test(
                        data.toString(),
                    )
                ) {
                    this.stop();
                }
            });
        }

        // wait a little bit for the target node process
        // to finish opening a port
        setTimeout(() => {
            logger.info("started");
            this.fire("started", {
                interface: {
                    host: "127.0.0.1", // TODO: options for these
                    port: 9229,
                },
            });
        }, 500); // TODO: don't hardcode
    }

    private onExit(): void {
        this.process = null;
        this.fire("stopped", undefined);
    }
}

export interface NodeConnectorConfig {
    readonly script: string;
    readonly name?: string;
    readonly nodePath?: string;
}

export function node(config: NodeConnectorConfig): TargetFactory {
    return (env: Environment): Target => {
        return new ManagedScript(config, env);
    };
}
