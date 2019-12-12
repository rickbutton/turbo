import { Client } from "./client";
import { mockSocket } from "./mocksocket";
import { SyncMessage } from "./shared";
import { SessionId } from "@turbo/core";

function exampleSyncMessage(): SyncMessage {
    return {
        type: "sync",
        payload: {
            state: {
                targets: {},
            },
        },
    };
}

describe("Client", () => {
    test("handles the sync event", () => {
        const socket = mockSocket();
        const client = new Client({
            type: "unmanaged",
            sessionId: "id" as SessionId,
            socket,
            connected: true,
        });

        const listener = jest.fn();
        client.on("sync", listener);

        const callbacks = socket.on.mock.calls.filter(
            ([name]) => name === "data",
        );
        expect(callbacks.length).toBe(1);

        const [_, callback] = callbacks[0];

        const msg = exampleSyncMessage();
        callback(msg);
        expect(listener.mock.calls).toEqual([[msg.payload.state]]);
    });
});
