import {
    logger,
    TargetConnection,
    Target,
    StartedEvent,
    PausedEvent,
    CallFrameId,
    ScriptId,
    Environment,
    State,
    Action,
    reduce,
    initialState,
    EmitterBase,
    Emitter,
    EvalResponse,
} from "@turbo/core";
import { connect } from "./v8";

export interface TurboContext extends Emitter<TurboContextEvents> {
    readonly state: State;
    eval(value: string, id: CallFrameId): Promise<EvalResponse>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stepInto(): Promise<void>;
    stepOut(): Promise<void>;
    stepOver(): Promise<void>;
    getScriptSource(id: ScriptId): Promise<string>;
}
interface TurboContextEvents {
    state: State;
}
class TurboContextImpl extends EmitterBase<TurboContextEvents>
    implements TurboContext {
    private conn: TargetConnection | null = null;

    private _state: State;
    private target: Target;

    get state(): State {
        return this._state;
    }

    private env: Environment;
    constructor(env: Environment, target: Target) {
        super();
        this.env = env;
        this._state = initialState;

        this.connectTarget = this.connectTarget.bind(this);
        this.disconnectTarget = this.disconnectTarget.bind(this);
        this.onPaused = this.onPaused.bind(this);
        this.onResumed = this.onResumed.bind(this);

        this.target = target;
        this.target.on("started", this.connectTarget);
        this.target.on("stopped", this.disconnectTarget);
    }

    async eval(value: string, id: CallFrameId): Promise<EvalResponse> {
        if (this.conn) {
            return await this.conn.eval(value, id);
        } else {
            return {
                error: true,
                value: `unable to evaluate because the target is not this.connected`,
            };
        }
    }
    async pause(): Promise<void> {
        logger.debug("received pause command");
        if (this.conn) {
            this.conn.pause();
        }
        return undefined;
    }
    async resume(): Promise<void> {
        logger.debug("received resume command");
        if (this.conn) {
            this.conn.resume();
        }
        return undefined;
    }
    async stepInto(): Promise<void> {
        logger.debug("received stepInto command");
        if (this.conn) {
            this.conn.stepInto();
        }
        return undefined;
    }
    async stepOut(): Promise<void> {
        logger.debug("received stepOut command");
        if (this.conn) {
            this.conn.stepOut();
        }
        return undefined;
    }
    async stepOver(): Promise<void> {
        logger.debug("received stepOver command");
        if (this.conn) {
            this.conn.stepOver();
        }
        return undefined;
    }
    async getScriptSource(id: ScriptId): Promise<string> {
        logger.debug("received getScriptSource command");
        if (this.conn) {
            return await this.conn.getScriptSource(id);
        } else {
            // TODO: better error message
            return "target is not connected";
        }
    }

    public start(): void {
        this.target.start();
    }
    public stop(): void {
        this.target.stop();
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

                this.dispatch({ type: "target-connect" });

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

            this.dispatch({ type: "target-disconnect" });
        }
    }

    private onPaused(event: PausedEvent): void {
        this.dispatch({
            type: "paused",
            callFrames: event.callFrames,
        });
    }
    private onResumed(): void {
        this.dispatch({
            type: "resumed",
        });
    }

    private dispatch(action: Action): void {
        this._state = reduce(this._state, action);
        this.fire("state", this._state);
    }
}

export function makeContext(env: Environment): TurboContextImpl {
    const targetFactory = env.config.target;
    const target = targetFactory(env.host);

    // TODO
    logger.on("log", _ => {
        //foo
    });
    target.on("stdout", _ => {
        //foo
    });
    target.on("stderr", _ => {
        //foo
    });

    return new TurboContextImpl(env, target);
}
