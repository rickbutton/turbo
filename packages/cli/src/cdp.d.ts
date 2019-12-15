declare module "chrome-remote-interface" {
    import { ProtocolProxyApi } from "devtools-protocol/types/protocol-proxy-api";

    interface Options {
        host: string;
        port: number;
    }

    interface ClientEvents {
        disconnect: undefined;
        error: any;
    }
    export interface Client {
        on<T extends keyof ClientEvents>(
            type: T,
            cb: (e: ClientEvents[T]) => void,
        ): void;
        Runtime: ProtocolProxyApi.RuntimeApi;
    }

    export type Factory = (options: Options) => Promise<Client>;
    const mod: Factory;
    export default mod;
}
