import { Emitter } from "./emitter";

declare const __CallFrameIdSymbol: unique symbol;
export type CallFrameId = string & {
    readonly __tag: typeof __CallFrameIdSymbol;
};
declare const __ScriptIdSymbol: unique symbol;
export type ScriptId = string & {
    readonly __tag: typeof __ScriptIdSymbol;
};
declare const __ObjectIdSymbol: unique symbol;
export type ObjectId = string & {
    readonly __tag: typeof __ObjectIdSymbol;
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

interface StringRemoteObject {
    type: "string";
    value: string;
}
interface NumberRemoteObject {
    type: "number";
    value: number;
    description: string;
}
interface BooleanRemoteObject {
    type: "boolean";
    value: boolean;
}
interface SymbolRemoteObject {
    type: "symbol";
    description: string;
    objectId: ObjectId;
}
interface BigIntRemoteObject {
    type: "bigint";
    value: string;
    description: string;
}
interface UndefinedRemoteObject {
    type: "undefined";
}
interface FunctionRemoteObject {
    type: "function";
    className: string;
    description: string;
    objectId: ObjectId;
}
interface ObjectRemoteObject {
    type: "object";
    className: string;
    subtype: string | undefined;
    description: string;
    objectId: ObjectId;
}
export type RemoteObject =
    | StringRemoteObject
    | NumberRemoteObject
    | BooleanRemoteObject
    | SymbolRemoteObject
    | BigIntRemoteObject
    | UndefinedRemoteObject
    | FunctionRemoteObject
    | ObjectRemoteObject;

export interface RemoteException {
    text: string;
    line: number;
    column: number;
    scriptId: ScriptId;
    url: string | undefined;
    // TODO: stackTrace
    exception: RemoteObject | undefined;
}

export interface PausedEvent {
    callFrames: CallFrame[];
}

export interface TargetConnectionEvents {
    close: void;

    paused: PausedEvent;
    resumed: void;
}

export type EvalResponse =
    | { error: false; success: true; value: RemoteObject }
    | { error: false; success: false; value: RemoteException }
    | { error: true; value: string };
export interface TargetConnection extends Emitter<TargetConnectionEvents> {
    enable(): Promise<void>;
    close(): Promise<void>;
    eval(script: string, id: CallFrameId): Promise<EvalResponse>;
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
