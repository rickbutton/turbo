import * as ChromeRemoteInterface from "chrome-remote-interface";
import { Target, TargetConnection } from "./state";

const CDP = ChromeRemoteInterface as any;

export async function connect(target: Target): Promise<TargetConnection> {
    const { host, port } = target.interface;

    const client = await CDP({ host, port });

    const { Runtime } = client;

    // await Runtime.runIfWaitingForDebugger();
    return {
        async eval(script: string): Promise<string> {
            const { result, exceptionDetails } = await Runtime.evaluate({
                expression: `(${script})`,
            });
            if (exceptionDetails) {
                return JSON.stringify(exceptionDetails);
            } else {
                return JSON.stringify(result);
            }
        },
    };
}
