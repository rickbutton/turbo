import { State, Action, Breakpoint, Script, ScriptId } from "./state";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import { rootSaga } from "./sagas";
import { logger, Server, Target, Turbo } from ".";

function pushed<T>(arr: T[], v: T): T[] {
    return [...arr, v];
}

function isSameBreakLocation(a: Breakpoint, b: Breakpoint): boolean {
    return a.url === b.url && a.line === b.line && a.column === b.column;
}

function unvalidateBreakpoints(breakpoints: Breakpoint[]): Breakpoint[] {
    return breakpoints.filter(b => ({
        ...b,
        raw: undefined,
    }));
}

function getScriptById(scripts: Script[], id: ScriptId): Script | undefined {
    return scripts.find(s => s.id === id);
}

function reduce(
    initialState: State,
    state: State | undefined,
    action: Action,
): State {
    if (!state) return initialState;

    switch (action.type) {
        case "connected":
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
                    focusedCallFrame: 0,
                },
            };
        case "disconnected":
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
                    focusedCallFrame: 0,
                },
            };
        case "paused":
            return {
                ...state,
                target: {
                    ...state.target,
                    paused: true,
                    callFrames: action.callFrames,
                    focusedCallFrame: 0,
                },
            };
        case "resumed":
            return {
                ...state,
                target: {
                    ...state.target,
                    paused: false,
                    callFrames: undefined,
                    focusedCallFrame: 0,
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
            const breakpoint = action.breakpoint;
            const breakpointExists = state.target.breakpoints.some(b =>
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
        case "verify-breakpoint":
            const verifiedBreakpoint = action.breakpoint;
            if (!verifiedBreakpoint.raw) return state;

            const location = verifiedBreakpoint.raw.location;
            const script = getScriptById(
                state.target.scripts,
                location.scriptId,
            );

            if (script) {
                const breakpoints = state.target.breakpoints;
                return {
                    ...state,
                    target: {
                        ...state.target,
                        breakpoints: breakpoints.map(b =>
                            b.id === verifiedBreakpoint.id
                                ? { ...verifiedBreakpoint }
                                : b,
                        ),
                    },
                };
            } else {
                logger.error(
                    `received verify-breakpoint action with unknown script id ${location.scriptId}`,
                );
                return state;
            }
        case "removed-b":
            return {
                ...state,
                target: {
                    ...state.target,
                    breakpoints: state.target.breakpoints.filter(
                        b => b.id !== action.id,
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
        case "focus-up":
            return {
                ...state,
                target: {
                    ...state.target,
                    focusedCallFrame: state.target.paused
                        ? Math.min(
                              state.target.focusedCallFrame + 1,
                              state.target.callFrames.length - 1,
                          )
                        : state.target.focusedCallFrame,
                },
            };
        case "focus-down":
            return {
                ...state,
                target: {
                    ...state.target,
                    focusedCallFrame: state.target.paused
                        ? Math.max(state.target.focusedCallFrame - 1, 0)
                        : state.target.focusedCallFrame,
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

export function makeStore(
    turbo: Turbo,
    server: Server,
    target: Target,
    state: State,
): Store {
    const sagaMiddleware = createSagaMiddleware();

    const store = createStore(
        reduce.bind(null, state),
        applyMiddleware(sagaMiddleware),
    );
    sagaMiddleware.run(rootSaga, turbo, server, target);

    // TODO: fix this cast?
    return (store as unknown) as Store;
}
