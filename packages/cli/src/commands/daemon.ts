import {
    Server,
    ServerConnection,
    Request,
    ResponsePayload,
    ServerRequestHandler,
} from "@turbo/net";
import {
    Turbo,
    createLogger,
    State,
    Action,
    StateReducer,
    TargetConnection,
    Target,
    StartedEvent,
    PausedEvent,
} from "@turbo/core";
import { getCurrentSessionId } from "@turbo/tmux";
import { connect } from "../v8";

const logger = createLogger("daemon");

function setupTarget(turbo: Turbo): Target {
    const targetFactory = turbo.config.target;
    const target = targetFactory(turbo.env);
    return target;
}

class Daemon implements ServerRequestHandler {
    private conn: TargetConnection | null = null;
    private reducer: StateReducer;

    constructor(target: Target, reducer: StateReducer) {
        this.reducer = reducer;

        this.connectTarget = this.connectTarget.bind(this);
        this.disconnectTarget = this.disconnectTarget.bind(this);
        this.onPaused = this.onPaused.bind(this);
        this.onResumed = this.onResumed.bind(this);
        this.onStdout = this.onStdout.bind(this);
        this.onStderr = this.onStderr.bind(this);

        target.on("started", this.connectTarget);
        target.on("stopped", this.disconnectTarget);
        target.on("stdout", this.onStdout);
        target.on("stderr", this.onStderr);

        process.on("SIGINT", () => {
            if (!target.isRunning) {
                process.exit();
            } else {
                target.stop();
            }
        });
    }

    async eval(req: Request<"eval">): Promise<ResponsePayload<"eval">> {
        if (this.conn) {
            return await this.conn.eval(req.payload.value, req.payload.id);
        } else {
            return {
                error: true,
                value: `unable to evaluate because the target is not this.connected`,
            };
        }
    }
    async pause(): Promise<ResponsePayload<"pause">> {
        logger.debug("received pause command");
        if (this.conn) {
            this.conn.pause();
        }
        return undefined;
    }
    async resume(): Promise<ResponsePayload<"resume">> {
        logger.debug("received resume command");
        if (this.conn) {
            this.conn.resume();
        }
        return undefined;
    }
    async stepInto(): Promise<ResponsePayload<"stepInto">> {
        logger.debug("received stepInto command");
        if (this.conn) {
            this.conn.stepInto();
        }
        return undefined;
    }
    async stepOut(): Promise<ResponsePayload<"stepOut">> {
        logger.debug("received stepOut command");
        if (this.conn) {
            this.conn.stepOut();
        }
        return undefined;
    }
    async stepOver(): Promise<ResponsePayload<"stepOver">> {
        logger.debug("received stepOver command");
        if (this.conn) {
            this.conn.stepOver();
        }
        return undefined;
    }
    async getScriptSource(
        req: Request<"getScriptSource">,
    ): Promise<ResponsePayload<"getScriptSource">> {
        logger.debug("received getScriptSource command");
        if (this.conn) {
            return {
                script: await this.conn.getScriptSource(req.payload.scriptId),
            };
        } else {
            return {
                // TODO: better error message
                script: "target is not connected",
            };
        }
    }

    private async connectTarget(event: StartedEvent): Promise<void> {
        if (!this.conn) {
            const iface = event.interface;
            logger.info(`target updated host:${iface.host} port:${iface.port}`);
            try {
                const target = await connect(iface.host, iface.port);

                this.conn = target;
                this.conn.on("paused", this.onPaused);
                this.conn.on("resumed", this.onResumed);

                this.reducer.action({ type: "target-connect" });

                logger.info("target connnected");
                await this.conn.enable();
                logger.info("target enabled");
            } catch (error) {
                logger.info(`target failed to connect: ${error.toString()}`);
                this.conn = null;
            }
        }
    }

    private async disconnectTarget(): Promise<void> {
        if (this.conn) {
            logger.info("target disconnected");
            await this.conn.close();

            this.conn.off("paused", this.onPaused);
            this.conn.off("resumed", this.onResumed);
            this.conn = null;

            this.reducer.action({ type: "target-disconnect" });
        }
    }

    private onStdout(data: any): void {
        process.stdout.write(data.toString());
    }
    private onStderr(data: any): void {
        process.stderr.write(data.toString());
    }
    private onPaused(event: PausedEvent): void {
        this.reducer.action({
            type: "paused",
            callFrames: event.callFrames,
        });
    }
    private onResumed(): void {
        this.reducer.action({
            type: "resumed",
        });
    }
}

export function daemon(turbo: Turbo): void {
    const sessionId = getCurrentSessionId(turbo.env);
    const reducer = new StateReducer({
        target: {
            connected: false,
            runtime: { paused: false },
        },
    });

    if (!sessionId) {
        logger.error("unable to identify current session");
        return;
    }

    const target = setupTarget(turbo);
    const daemon = new Daemon(target, reducer);
    const server = new Server(sessionId, daemon);

    reducer.on("update", (state: State) => {
        server.broadcast(state);
    });

    server.on("connected", (conn: ServerConnection) => {
        conn.broadcast(reducer.state);
    });

    server.on("action", (action: Action) => {
        reducer.action(action);
    });

    target.start();
    server.start();
}
