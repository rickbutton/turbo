import { logger } from "@turbo/core";
import { Client, LogClient } from "@turbo/net";

type LogType = "turbo" | "target";
export function log(type: LogType, client: Client): void {
    let first = true;
    client.on("sync", state => {
        if (first) {
            first = false;
            const path =
                type === "turbo"
                    ? state.logStream.turboSocket
                    : state.logStream.targetSocket;

            const logClient = new LogClient(path);
            logClient.on("data", (msg: string) => {
                process.stdout.write(msg);
            });

            logClient.connect();
        }
    });
}
