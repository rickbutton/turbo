export interface TargetConnection {
    eval(script: string): Promise<string>;
}

interface BaseTarget {
    id: string;
    interface: {
        host: string;
        port: number;
    };
}
export interface ConnectedTarget extends BaseTarget {
    connected: true;
    connection: TargetConnection;
}
export interface DisconnectedTarget extends BaseTarget {
    connected: false;
}
export type Target = ConnectedTarget | DisconnectedTarget;

export interface State {
    targets: { [id: string]: Target };
}

export interface TargetStartedAction {
    type: "tarstart";
    id: string;
    interface: {
        host: string;
        port: number;
    };
}

export interface TargetStoppedAction {
    type: "tarstop";
    id: string;
}
export interface TargetConnectedAction {
    type: "tarconn";
    id: string;
    connection: TargetConnection;
}
export interface TargetDisconnectedAction {
    type: "tardis";
    id: string;
}

export type Action =
    | TargetStartedAction
    | TargetStoppedAction
    | TargetConnectedAction
    | TargetDisconnectedAction;
export type ActionType = Action["type"];
