import { State, Action, Breakpoint } from "./state";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import { rootSaga } from "./sagas";
import { logger, uuid, Server, Target } from ".";

function pushed<T>(arr: T[], v: T): T[] {
    return [...arr, v];
}

function isSameBreakLocation(a: Breakpoint, b: Breakpoint): boolean {
    const aLine = a.verified ? a.location.line : a.line;
    const aCol = a.verified ? a.location.column : a.column;

    const bLine = b.verified ? b.location.line : b.line;
    const bCol = b.verified ? b.location.column : b.column;

    return (
        a.normalizedUrl === b.normalizedUrl && aLine === bLine && aCol === bCol
    );
}

function unvalidateBreakpoints(breakpoints: Breakpoint[]): Breakpoint[] {
    return breakpoints.filter(b =>
        b.verified
            ? {
                  verified: false,
                  url: b.url,
                  normalizedUrl: b.url,
                  condition: b.url,
                  id: uuid(),
                  line: b.location.line,
                  column: b.location.column,
              }
            : b,
    );
}

function reduce(
    initialState: State,
    state: State | undefined,
    action: Action,
): State {
    if (!state) return initialState;

    switch (action.type) {
        case "connect":
            return {
                ...state,
                target: {
                    ...state.target,
                    connected: true,
                    paused: false,
                    breakpointsEnabled: true,
                    breakpoints: unvalidateBreakpoints(
                        state.target.breakpoints,
                    ),
                    callFrames: undefined,
                    scripts: [],
                },
            };
        case "disconnect":
            return {
                ...state,
                target: {
                    ...state.target,
                    connected: false,
                    paused: false,
                    breakpoints: unvalidateBreakpoints(
                        state.target.breakpoints,
                    ),
                    callFrames: undefined,
                    scripts: [],
                },
            };
        case "paused":
            return {
                ...state,
                target: {
                    ...state.target,
                    paused: true,
                    callFrames: action.callFrames,
                },
            };
        case "resumed":
            return {
                ...state,
                target: {
                    ...state.target,
                    paused: false,
                    callFrames: undefined,
                },
            };
        case "add-script":
            return {
                ...state,
                target: {
                    ...state.target,
                    scripts: pushed(state.target.scripts, action.script),
                },
            };
        case "set-breakpoint":
            const breakpoints = state.target.breakpoints;
            const breakpoint = action.breakpoint;
            const breakpointExists = breakpoints.some(b =>
                isSameBreakLocation(breakpoint, b),
            );

            if (breakpointExists) return state;

            return {
                ...state,
                target: {
                    ...state.target,
                    breakpoints: pushed(state.target.breakpoints, breakpoint),
                },
            };
        case "removed-unvb":
            return {
                ...state,
                target: {
                    ...state.target,
                    breakpoints: state.target.breakpoints.filter(
                        b => b.verified === true || b.id !== action.id,
                    ),
                },
            };
        case "removed-vb":
            return {
                ...state,
                target: {
                    ...state.target,
                    breakpoints: state.target.breakpoints.filter(
                        b => b.verified === false || b.id !== action.id,
                    ),
                },
            };
        case "set-b-enable":
            return {
                ...state,
                target: {
                    ...state.target,
                    breakpointsEnabled: action.enabled,
                },
            };
        default:
            return state;
    }
}

export interface Store {
    dispatch(action: Action): void;
    subscribe(cb: () => void): () => void;
    getState(): State;
}

export function makeStore(server: Server, target: Target, state: State): Store {
    const sagaMiddleware = createSagaMiddleware();

    const store = createStore(
        reduce.bind(null, state),
        applyMiddleware(sagaMiddleware),
    );
    sagaMiddleware.run(rootSaga, server, target);

    // TODO: fix this cast?
    return (store as unknown) as Store;
}
