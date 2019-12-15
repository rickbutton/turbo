import { Turbo, createLogger } from "@turbo/core";
import { Client } from "@turbo/net";
import { getCurrentSessionId } from "@turbo/tmux";

const logger = createLogger("eval");

export function evaluate(turbo: Turbo, expr: string): void {
    const sessionId = getCurrentSessionId(turbo.env);
    if (!sessionId) {
        logger.error("unable to identify current session");
        return;
    }
    const client = new Client({ type: "managed", sessionId });

    client.once("sync", async state => {
        const runtime = state.target.runtime;
        if (!runtime.paused) {
            logger.error("target is not paused");
            process.exit(1);
        } else {
            const topCallFrame = runtime.callFrames[0];
            const { value } = await client.eval(expr, topCallFrame.id);
            console.log(value);
            client.close();
            process.exit(0);
        }
    });

    client.connect();
}
