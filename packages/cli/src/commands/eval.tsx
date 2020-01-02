import { Turbo, logger } from "@turbo/core";
import { Client } from "@turbo/net";
import { getCurrentSessionId } from "@turbo/tmux";

import React from "react";
import { render } from "../renderer";
import { ObjectView } from "../components/object";

export function evaluate(turbo: Turbo, expr: string): void {
    const sessionId = getCurrentSessionId(turbo);
    if (!sessionId) {
        console.error("unable to identify current session");
        return;
    }
    const client = new Client(turbo, { type: "managed", sessionId });

    client.once("sync", async state => {
        const runtime = state.target.runtime;
        if (!runtime.paused) {
            logger.error("target is not paused");
            process.exit(1);
        } else {
            const topCallFrame = runtime.callFrames[0];
            const result = await client.eval(expr, topCallFrame.id);

            if (result.error) {
                console.log(result.value);
            } else if (!result.success) {
                render(
                    result.value.exception ? (
                        <ObjectView object={result.value.exception} />
                    ) : (
                        <span>{result.value.text}</span>
                    ),
                );
            } else {
                render(<ObjectView object={result.value} />);
            }
            client.close();
            process.exit(0);
        }
    });

    client.connect();
}
