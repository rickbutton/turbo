import { EmitterBase } from "./emitter";
import { createLogger } from "./logger";
import { State, Action } from "./state";

const logger = createLogger("reducer");

interface StateReducerEvents {
    update: State;
}
export class StateReducer extends EmitterBase<StateReducerEvents> {
    public state: State;
    constructor(state: State) {
        super();
        this.state = state;
    }

    public action(action: Action): void {
        const state = this.reduce(action);
        this.state = state;
        logger.debug(`new state: ${JSON.stringify(state)}`);

        this.fire("update", state);
    }

    private reduce(action: Action): State {
        const state = this.state;

        if (action.type === "target-connect") {
            return {
                ...state,
                target: {
                    connected: true,
                    runtime: { paused: false },
                },
            };
        } else if (action.type === "target-disconnect") {
            return {
                ...state,
                target: {
                    connected: false,
                    runtime: { paused: false },
                },
            };
        } else if (action.type === "paused") {
            return {
                ...state,
                target: {
                    ...state.target,
                    runtime: {
                        paused: true,
                        callFrames: action.callFrames,
                    },
                },
            };
        } else if (action.type === "resumed") {
            return {
                ...state,
                target: {
                    ...state.target,
                    runtime: {
                        paused: false,
                    },
                },
            };
        } else {
            return state;
        }
    }
}
