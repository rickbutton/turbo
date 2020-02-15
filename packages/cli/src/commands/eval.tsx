import { Turbo, logger, getCurrentSessionId } from "@turbo/core";
import { Client } from "@turbo/net";

import React from "react";
import { render } from "../renderer";
import { Eval } from "../components/eval";

export function evaluate(turbo: Turbo, expr: string): void {
    const sessionId = getCurrentSessionId(turbo);
    if (!sessionId) {
        console.error("unable to identify current session");
        return;
    }
    const client = new Client(turbo, { type: "managed", sessionId });

    client.once("sync", async state => {
        const target = state.target;
        if (!target.paused) {
            logger.error("target is not paused");
            turbo.env.exit();
        } else {
            const topCallFrame = target.callFrames[0];
            const result = await client.eval(expr, topCallFrame.id);

            render(<Eval result={result} />, "stdout");
            client.close();
            turbo.env.exit();
        }
    });

    client.connect();
}
