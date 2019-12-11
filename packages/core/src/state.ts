export interface State {
    counter: number;
    value: number;
}

export interface IncrementAction {
    name: "increment";
    counter: number;
}

export type Action = IncrementAction;
export type ActionType = Action["name"];

export function reduce(state: State, action: Action): State {
    if (state.counter !== action.counter) {
        return state;
    }

    switch (action.name) {
        case "increment":
            return {
                counter: state.counter + 1,
                value: state.value + 1,
            };
        default:
            return state;
    }
}
