import {
    Target,
    TargetEvents,
    Environment,
    TargetFactory,
    EmitterBase,
} from "@turbo/core";
import * as child from "child_process";

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

        this.process = child.spawn(nodePath, args, {
            stdio: "inherit",
        });
        this.process.on("exit", this.onExit.bind(this));
        this.process.on("kill", this.onExit.bind(this));

        this.fire("started", {
            interface: {
                host: "127.0.0.1", // TODO: options for these
                port: 9229,
            },
        });
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
