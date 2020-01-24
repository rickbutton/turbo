export interface TargetStartedSagaAction {
    type: "started";
    host: string;
    port: number;
}
export interface TargetStoppedSagaAction {
    type: "stopped";
}
export type TargetSagaAction =
    | TargetStartedSagaAction
    | TargetStoppedSagaAction;
