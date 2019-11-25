import { Client, ClientSocket } from "./client";
import { SessionId, State } from "@jug/core";

jest.useFakeTimers();

function mockSocket(): jest.Mocked<ClientSocket> {
    return {
        connect: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
    };
}

function exampleState(): State {
    return {
        counter: 0,
        value: 0,
    };
}

describe("Client", () => {
    test("correctly connects to the unix socket", () => {
        const socket = mockSocket();

        const client = new Client("id" as SessionId, socket);
        client.connect();

        expect(socket.connect.mock.calls.length).toBe(1);
        expect(socket.connect.mock.calls).toEqual([["/tmp/jug-session-id"]]);
    });

    test("sends object to socket", () => {
        const socket = mockSocket();

        const client = new Client("id" as SessionId, socket);

        const obj = { name: "increment", counter: 0 } as const;
        client.send(obj);

        expect(socket.write.mock.calls.length).toBe(1);
        expect(socket.write.mock.calls).toEqual([[obj]]);
    });

    test("handles the state event", () => {
        const socket = mockSocket();
        const client = new Client("id" as SessionId, socket);

        const listener = jest.fn();
        client.on("state", listener);

        const callbacks = socket.on.mock.calls.filter(
            ([name]) => name === "data",
        );
        expect(callbacks.length).toBe(1);

        const [_, callback] = callbacks[0];

        callback(exampleState());
        expect(listener.mock.calls).toEqual([[exampleState()]]);
    });

    test("handles the ready event", () => {
        const socket = mockSocket();
        const client = new Client("id" as SessionId, socket);

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
        const _ = new Client("id" as SessionId, socket);

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
