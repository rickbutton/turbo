import { startDaemon } from "@jug/daemon";
import { Jug, createLogger } from "@jug/core";
import { getCurrentSessionId } from "@jug/tmux";

const logger = createLogger("daemon");

export function daemon(jug: Jug): void {
    const sessionId = getCurrentSessionId(jug.env);
    if (sessionId) {
        startDaemon(sessionId);
    } else {
        logger.error("unable to identify current session");
    }
}
