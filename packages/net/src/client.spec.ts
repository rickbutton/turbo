import { Client } from "./client";
import { mockSocket } from "./mocksocket";
import { SessionId, Message } from "@turbo/core";
import { TEST_TURBO } from "./mocks";

function exampleSyncMessage(): Message<"sync"> {
    return {
        type: "sync",
        payload: {
            state: {
                keepAlive: false,
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
                    turboSocket: "",
                    targetSocket: "",
                },
            },
        },
    };
}

describe("Client", () => {
    test("handles the sync event", () => {
        const socket = mockSocket();
        const client = new Client(TEST_TURBO, {
            type: "unmanaged",
            sessionId: "id" as SessionId,
            socket,
            connected: true,
        });

        const listener = jest.fn();
        client.on("sync", listener);

        const callbacks = socket.on.mock.calls.filter(
            ([name]) => name === "message",
        );
        expect(callbacks.length).toBe(1);

        const [_, callback] = callbacks[0];

        const msg = exampleSyncMessage();
        callback(msg);
        expect(listener.mock.calls).toEqual([[msg.payload.state]]);
    });
});
