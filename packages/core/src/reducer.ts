import { EmitterBase } from "./emitter";
import {
    State,
    Action,
    Target,
    DisconnectedTarget,
    ConnectedTarget,
    TargetConnection,
} from "./state";
import { connect } from "./v8";

function without<V>(obj: Record<string, V>, key: string): Record<string, V> {
    return Object.keys(obj).reduce((newObj: Record<string, V>, k: string) => {
        if (k !== key) {
            newObj[k] = obj[k];
        }
        return newObj;
    }, {} as Record<string, V>);
}

function connectTarget(
    target: Target,
    connection: TargetConnection,
): ConnectedTarget {
    return {
        id: target.id,
        interface: target.interface,
        connected: true,
        connection,
    };
}

function disconnectTarget(target: Target): DisconnectedTarget {
    return { id: target.id, interface: target.interface, connected: false };
}

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

        this.fire("update", state);
    }

    private connect(target: Target): void {
        connect(target)
            .then(connection =>
                this.action({ type: "tarconn", id: target.id, connection }),
            )
            .catch(_ => {
                // TODO: log verbose error?
                // TODO: don't hardcode this number
                setTimeout(() => this.connect(target), 2000);
            });
    }

    private reduce(action: Action): State {
        const state = this.state;

        switch (action.type) {
            case "tarstart":
                const target: Target = {
                    id: action.id,
                    interface: { ...action.interface },
                    connected: false,
                };

                this.connect(target);
                return {
                    ...state,
                    targets: {
                        ...state.targets,
                        [action.id]: target,
                    },
                };
            case "tarstop":
                return {
                    ...state,
                    targets: without(state.targets, action.id),
                };
            case "tarconn":
                return {
                    ...state,
                    targets: {
                        ...state.targets,
                        [action.id]: connectTarget(
                            state.targets[action.id],
                            action.connection,
                        ),
                    },
                };
            case "tardis": {
                return {
                    ...state,
                    targets: {
                        ...state.targets,
                        [action.id]: disconnectTarget(state.targets[action.id]),
                    },
                };
            }
            default:
                return state;
        }
    }
}
