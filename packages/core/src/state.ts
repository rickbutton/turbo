import { Emitter } from "./emitter";

declare const __CallFrameIdSymbol: unique symbol;
export type CallFrameId = string & {
    readonly __tag: typeof __CallFrameIdSymbol;
};
declare const __ScriptIdSymbol: unique symbol;
export type ScriptId = string & {
    readonly __tag: typeof __ScriptIdSymbol;
};

export interface SourceLocation {
    scriptId: ScriptId;
    line: number;
    column?: number;
}
export interface CallFrame {
    id: CallFrameId;
    functionName: string;
    location: SourceLocation;
}

interface PausedEvent {
    callFrames: CallFrame[];
}

export interface TargetConnectionEvents {
    close: void;

    paused: PausedEvent;
    resumed: void;
}
export interface TargetConnection extends Emitter<TargetConnectionEvents> {
    close(): Promise<void>;
    eval(script: string, id: CallFrameId): Promise<string>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stepInto(): Promise<void>;
    stepOut(): Promise<void>;
    stepOver(): Promise<void>;
    getScriptSource(scriptId: ScriptId): Promise<string>;
}

interface TargetRuntimePaused {
    paused: true;
    callFrames: CallFrame[];
}
interface TargetRuntimeRunning {
    paused: false;
}
type TargetRuntime = TargetRuntimePaused | TargetRuntimeRunning;
interface TargetDescriptor {
    connected: boolean;
    runtime: TargetRuntime;
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
export interface TargetPausedAction {
    type: "paused";
    callFrames: CallFrame[];
}
export interface TargetResumedAction {
    type: "resumed";
}

export type Action =
    | TargetConnectedAction
    | TargetDisconnectedAction
    | TargetPausedAction
    | TargetResumedAction;
export type ActionType = Action["type"];
