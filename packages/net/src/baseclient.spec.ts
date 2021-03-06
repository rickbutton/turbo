import { BaseClient } from "./baseclient";
import { mockSocket } from "./mocksocket";
import {
    SessionId,
    ResponsePayload,
    RequestId,
    AnyMessage,
    AnyRequest,
    RequestType,
} from "@turbo/core";
import * as core from "@turbo/core";
import { TEST_TURBO } from "./mocks";

jest.useFakeTimers();
jest.spyOn(core, "uuid").mockReturnValue("uuid-foo-bar");

class TestClient extends BaseClient {
    protected handleUnhandledMessage(msg: AnyMessage): void {
        throw new Error(JSON.stringify(msg));
    }
    protected handleUnhandledRequest(
        _: AnyRequest,
    ): Promise<ResponsePayload<RequestType>> {
        throw new Error("foo");
    }
}

describe("BaseClient", () => {
    test("correctly connects to the unix socket", () => {
        const socket = mockSocket();

        const client = new TestClient(TEST_TURBO, {
            type: "unmanaged",
            sessionId: "id" as SessionId,
            socket,
            connected: false,
        });
        client.connect();

        expect(socket.connect.mock.calls.length).toBe(1);
        expect(socket.connect.mock.calls).toEqual([["/tmp/turbo/sessions/id"]]);
    });

    test("correctly sends a ping", async () => {
        const socket = mockSocket();

        const client = new TestClient(TEST_TURBO, {
            type: "unmanaged",
            sessionId: "id" as SessionId,
            socket,
            connected: true,
        });

        const promise = client.ping("foobar");

        const response: AnyMessage = {
            type: "res",
            payload: {
                id: "uuid-foo-bar" as RequestId,
                type: "ping",
                payload: "foobar",
            },
        };
        socket.fire("message", response);

        const pingReturn = await promise;
        expect(pingReturn).toBe("foobar");
        expect(socket.write.mock.calls.length).toBe(1);
        expect(socket.write.mock.calls).toEqual([
            [
                {
                    type: "req",
                    payload: {
                        type: "ping",
                        id: "uuid-foo-bar",
                        payload: "foobar",
                    },
                },
            ],
        ]);
    });

    test("handles the ready event", () => {
        const socket = mockSocket();
        const client = new TestClient(TEST_TURBO, {
            type: "unmanaged",
            sessionId: "id" as SessionId,
            socket,
            connected: true,
        });

        const listener = jest.fn();
        client.on("ready", listener);

        const callbacks = socket.on.mock.calls.filter(
            ([name]) => name === "ready",
        );
        expect(callbacks.length).toBe(1);

        const [_, callback] = callbacks[0];
        callback(undefined);
        expect(listener.mock.calls).toEqual([[undefined]]);
    });

    test("automatically reconnects on close", () => {
        const socket = mockSocket();
        const _ = new TestClient(TEST_TURBO, {
            type: "unmanaged",
            sessionId: "id" as SessionId,
            socket,
            connected: true,
        });

        const callbacks = socket.on.mock.calls.filter(
            ([name]) => name === "close",
        );
        expect(callbacks.length).toBe(1);
        const [__, callback] = callbacks[0];
        callback(undefined);

        jest.runAllTimers();

        expect(socket.connect.mock.calls.length).toBe(1);
    });
});
