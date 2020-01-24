declare module "chrome-remote-interface" {
    export { Protocol } from "devtools-protocol";
    import { Protocol } from "devtools-protocol";
    import { ProtocolProxyApi } from "devtools-protocol/types/protocol-proxy-api";

    type EmitterCallback<T> = (event: T) => void;
    interface Emitter<T> {
        on<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void;
        once<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void;
        off<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void;
        clear<N extends keyof T>(name: N): void;
        fire<N extends keyof T>(name: N, event: T[N]): void;
    }

    interface Options {
        host: string;
        port: number;
    }

    type Cb<T> = (event: T) => void;

    interface Debugger {
        paused(cb: Cb<Protocol.Debugger.PausedEvent>): void;
        resumed(cb: Cb<undefined>): void;
        scriptParsed(cb: Cb<Protocol.Debugger.ScriptParsedEvent>): void;
        breakpointResolved(
            cb: Cb<Protocol.Debugger.BreakpointResolvedEvent>,
        ): void;
    }
    interface Runtime {
        executionContextCreated(
            cb: Cb<Protocol.Runtime.ExecutionContextCreatedEvent>,
        ): void;
        executionContextDestroyed(
            cb: Cb<Protocol.Runtime.ExecutionContextDestroyedEvent>,
        ): void;
    }

    interface ClientEvents {
        disconnect: undefined;
        error: any;
    }
    export interface Client extends Emitter<ClientEvents> {
        Runtime: Runtime & Omit<ProtocolProxyApi.RuntimeApi, "on">;
        Debugger: Debugger & Omit<ProtocolProxyApi.DebuggerApi, "on">;
        close(): Promise<void>;
    }

    export type Factory = (options: Options) => Promise<Client>;
    const mod: Factory;
    export default mod;
}
