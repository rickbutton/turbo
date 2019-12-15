import { Emitter } from "./emitter";

export interface TargetConnectionEvents {
    close: undefined;
}
export interface TargetConnection extends Emitter<TargetConnectionEvents> {
    eval(script: string): Promise<string>;
}

interface TargetDescriptor {
    connected: boolean;
}

export interface State {
    target: TargetDescriptor;
}

export interface TargetConnectedAction {
    type: "target-connect";
}
export interface TargetDisconnectedAction {
    type: "target-disconnect";
}

export type Action = TargetConnectedAction | TargetDisconnectedAction;
export type ActionType = Action["type"];
