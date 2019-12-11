import { BaseClient } from "./baseclient";
import { mockSocket } from "./mocksocket";
import { Message, Request, ResponsePayload, RequestId } from "./shared";
import { SessionId } from "@jug/core";

jest.useFakeTimers();
jest.mock("uuid/v4", () => jest.fn().mockReturnValue("uuid-foo-bar"));

class TestClient extends BaseClient {
    protected handleUnhandledMessage(msg: Message): void {
        throw new Error(JSON.stringify(msg));
    }
    protected handleUnhandledRequest(_: Request): ResponsePayload {
        throw new Error("foo");
    }
}

describe("BaseClient", () => {
    test("correctly connects to the unix socket", () => {
        const socket = mockSocket();

        const client = new TestClient({
            sessionId: "id" as SessionId,
            socket,
            connected: false,
        });
        client.connect();

        expect(socket.connect.mock.calls.length).toBe(1);
        expect(socket.connect.mock.calls).toEqual([["/tmp/jug-session-id"]]);
    });

    test("correctly sends a ping", async () => {
        const socket = mockSocket();

        const client = new TestClient({ sessionId: "id" as SessionId, socket });

        const promise = client.ping("foobar");

        const response: Message = {
            type: "res",
            payload: {
                id: "uuid-foo-bar" as RequestId,
                payload: "foobar",
            },
        };
        socket.fire("data", response);

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
        const client = new TestClient({ sessionId: "id" as SessionId, socket });

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
        const _ = new TestClient({ sessionId: "id" as SessionId, socket });

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
