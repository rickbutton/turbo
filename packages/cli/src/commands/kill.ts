import { Turbo, getCurrentSessionId } from "@turbo/core";
import { Client } from "@turbo/net";

export function kill(turbo: Turbo): void {
    const sessionId = getCurrentSessionId(turbo);
    if (!sessionId) {
        console.error("unable to identify current session");
        return;
    }

    const client = new Client(turbo, { type: "managed", sessionId });

    client.on("ready", () => {
        client.quit();
        process.exit(0);
    });

    client.connect();
}
