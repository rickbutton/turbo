import { logger } from "./logger";
import { State, Action } from "./state";

export const initialState: State = {
    target: {
        connected: false,
        runtime: { paused: false },
    },
    logs: [],
    debug: [],
};

export function reduce(state: State, action: Action): State {
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
    } else if (action.type === "log") {
        return {
            ...state,
            logs: [...state.logs, action.log],
        };
    } else if (action.type === "debug") {
        return {
            ...state,
            debug: [...state.debug, action.data],
        };
    } else {
        return state;
    }
}
