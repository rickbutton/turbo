import {
    Turbo,
    logger,
    makeStore,
    format,
    LogEvent,
    getCurrentSessionId,
} from "@turbo/core";
import { SocketLogServer, SocketServer } from "@turbo/net";

function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number,
): T {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function(...args: any[]): void {
        const later = (): void => {
            timeout = undefined;
            func(...args);
        };
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    } as any;
}

export async function daemon(turbo: Turbo): Promise<void> {
    const sessionId = getCurrentSessionId(turbo);
    if (!sessionId) {
        console.error("unable to identify current session");
        return;
    }

    // set up log servers for turbo logs and the target
    const turboLog = await SocketLogServer.create(turbo);
    const targetLog = await SocketLogServer.create(turbo);

    // connect the turbo logger to the turbo log server
    // and pipe to stdout (for running daemon directly)
    logger.on("log", log => {
        const msg = format(log);
        process.stdout.write(msg);
        turboLog.log(msg);
    });

    const targetFactory = turbo.config.target;
    const target = targetFactory(turbo.env);
    target.on("stdout", log => targetLog.log(log));
    target.on("stderr", log => targetLog.log(log));
    process.on("exit", () => target.stop());

    // set up the daemon server, started by the server saga
    const server = new SocketServer(turbo, sessionId);
    server.on("log", (log: LogEvent) => {
        const msg = format(log);
        process.stdout.write(msg);
        turboLog.log(msg);
    });

    // make the redux store
    const store = makeStore(turbo, server, target, {
        target: {
            connected: false,
            paused: false,
            callFrames: undefined,
            scripts: [],
            breakpoints: [],
            breakpointsEnabled: false,
            focusedCallFrame: 0,
        },
        logStream: {
            turboSocket: turboLog.socketPath,
            targetSocket: targetLog.socketPath,
        },
    });

    // broadcast state updates to all clients
    // TODO: how to refactor this into redux?
    let lastState = store.getState();
    store.subscribe(
        debounce(() => {
            const state = store.getState();
            if (lastState !== state) {
                lastState = state;
                server.broadcastState(state);
            }
        }, 10),
    );

    // listen for signals to force exit on
    process.on("SIGHUP", () => process.exit(0));
    process.on("SIGINT", () => process.exit(0));
}
