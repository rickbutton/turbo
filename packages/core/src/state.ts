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
declare const __BreakpointIdSymbol: unique symbol;
export type BreakpointId = string & {
    readonly __tag: typeof __BreakpointIdSymbol;
};
declare const __UnverifiedBreakpointIdSymbol: unique symbol;
export type UnverifiedBreakpointId = string & {
    readonly __tag: typeof __UnverifiedBreakpointIdSymbol;
};

export interface VerifiedBreakpoint {
    verified: true;
    url: string;
    normalizedUrl: string;
    condition?: string;

    id: BreakpointId;
    location: SourceLocation;
}
export interface UnverifiedBreakpoint {
    verified: false;
    url: string;
    normalizedUrl: string;
    condition?: string;

    id: UnverifiedBreakpointId;
    line: number;
    column?: number;
}
export type Breakpoint = VerifiedBreakpoint | UnverifiedBreakpoint;

export interface Script {
    id: ScriptId;
    url: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    hash: string;
    isLiveEdit?: boolean;
    sourceMapUrl?: string;
    hasSourceUrl?: boolean;
    isModule?: boolean;
    length?: number;
}
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
export interface BreakLocation {
    scriptId: ScriptId;
    line: number;
    column?: number;
    type?: "debuggerStatement" | "call" | "return";
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

export interface RemoteObjectProperty {
    name: string;
    value: RemoteObject;
    writable?: boolean;
    get?: RemoteObject;
    set?: RemoteObject;
    configurable: boolean;
    enumerable: boolean;
    isOwn: boolean;
    symbol?: RemoteObject;
}

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

export interface ScriptParsedEvent {
    script: Script;
}

export interface BreakpointResolvedEvent {
    breakpoint: VerifiedBreakpoint;
}

export interface BreakpointsEnabledUpdatedEvent {
    enabled: boolean;
}

export interface TargetConnectionEvents {
    close: void;

    paused: PausedEvent;
    resumed: void;
    scriptParsed: ScriptParsedEvent;
    breakpointResolved: BreakpointResolvedEvent;
}

export type EvalResponse =
    | { error: false; value: RemoteObject }
    | { error: true; value: RemoteException | string };
export type GetPropertiesResponse =
    | { error: false; value: RemoteObjectProperty[] }
    | { error: true; value: RemoteException | string };

export interface TargetConnection extends Emitter<TargetConnectionEvents> {
    readonly breakpointsEnabled: boolean;

    enable(): Promise<void>;
    close(): Promise<void>;
    eval(script: string, id: CallFrameId): Promise<EvalResponse>;
    getProperties(objectId: ObjectId): Promise<GetPropertiesResponse>;

    pause(): Promise<void>;
    resume(): Promise<void>;
    stepInto(): Promise<void>;
    stepOut(): Promise<void>;
    stepOver(): Promise<void>;
    setBreakpoint(location: SourceLocation, condition?: string): Promise<void>;
    removeBreakpoint(id: BreakpointId): Promise<void>;
    enableBreakpoints(): Promise<void>;
    disableBreakpoints(): Promise<void>;

    getPossibleBreakpointLocations(id: ScriptId): Promise<BreakLocation[]>;
    getScriptSource(id: ScriptId): Promise<string>;
}

interface BaseTargetDescriptor {
    connected: boolean;
    breakpoints: Breakpoint[];
    breakpointsEnabled: boolean;
    scripts: Script[];
}
interface PausedTargetDescriptor {
    paused: true;
    callFrames: CallFrame[];
}
interface RunningTargetDescriptor {
    paused: false;
    callFrames: undefined;
}
type TargetDescriptor = PausedTargetDescriptor | RunningTargetDescriptor;

interface LogStreamState {
    turboSocket: string;
    targetSocket: string;
}

export interface State {
    target: TargetDescriptor & BaseTargetDescriptor;
    logStream: LogStreamState;
}

export interface EmptyAction<T extends string> {
    type: T;
}

type EmptyRequestAction<R extends string, F extends string> =
    | EmptyAction<R>
    | EmptyAction<F>;

export interface TargetConnectedAction {
    type: "connect";
}
export interface TargetDisconnectedAction {
    type: "disconnect";
}

export type PausedRequestedAction = EmptyAction<"pause">;
export interface PausedAction {
    type: "paused";
    callFrames: CallFrame[];
}
export type StartAction = EmptyRequestAction<"start", "started">;
export type RestartAction = EmptyAction<"restart">;
export type StopAction = EmptyRequestAction<"stop", "stopped">;
export type ResumeAction = EmptyRequestAction<"resume", "resumed">;
export type StepIntoAction = EmptyAction<"stepInto">;
export type StepOutAction = EmptyAction<"stepOut">;
export type StepOverAction = EmptyAction<"stepOver">;

export interface AddScriptAction {
    type: "add-script";
    script: Script;
}
export interface SetBreakpointAction {
    type: "set-breakpoint";
    breakpoint: UnverifiedBreakpoint;
}
export interface VerifyBreakpointAction {
    type: "verify-breakpoint";
    breakpoint: VerifiedBreakpoint;
}
export interface RemoveVerifiedBreakpointRequestAction {
    type: "remove-vb-request";
    id: BreakpointId;
}
export interface RemovedVerifiedBreakpointAction {
    type: "removed-vb";
    id: BreakpointId;
}
export interface RemoveUnverifiedBreakpointRequestAction {
    type: "remove-unvb-request";
    id: UnverifiedBreakpointId;
}
export interface RemovedUnverifiedBreakpointAction {
    type: "removed-unvb";
    id: UnverifiedBreakpointId;
}

export interface SetBreakpointsEnabledRequestAction {
    type: "set-b-enable-request";
    enabled: boolean;
}
export interface SetBreakpointsEnabledAction {
    type: "set-b-enable";
    enabled: boolean;
}

export type Action =
    | TargetConnectedAction
    | TargetDisconnectedAction
    | PausedRequestedAction
    | StartAction
    | StopAction
    | RestartAction
    | PausedAction
    | ResumeAction
    | StepIntoAction
    | StepOutAction
    | StepOverAction
    | AddScriptAction
    | SetBreakpointAction
    | VerifyBreakpointAction
    | RemoveVerifiedBreakpointRequestAction
    | RemovedVerifiedBreakpointAction
    | RemoveUnverifiedBreakpointRequestAction
    | RemovedUnverifiedBreakpointAction
    | SetBreakpointsEnabledRequestAction
    | SetBreakpointsEnabledAction;

export type ActionType = Action["type"];
export type ActionByType<T extends ActionType> = Action & { type: T };
