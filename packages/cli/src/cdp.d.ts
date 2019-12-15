declare module "chrome-remote-interface" {
    import { Emitter } from "@turbo/core";
    export { Protocol } from "devtools-protocol";
    import { Protocol } from "devtools-protocol";
    import { ProtocolProxyApi } from "devtools-protocol/types/protocol-proxy-api";

    interface Options {
        host: string;
        port: number;
    }

    type Cb<T> = (event: T) => void;

    interface Debugger {
        paused(cb: Cb<Protocol.Debugger.PausedEvent>): void;
        resumed(cb: Cb<undefined>): void;
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
