import { JsonSocket } from "./index";

function mockSocket(): any {
    return {
        on: jest.fn(),
        destroy: jest.fn(),
        read: jest.fn(),
        write: jest.fn(),
    };
}

function toBuffer(obj: any): Buffer {
    const json = JSON.stringify(obj);
    const length = Buffer.byteLength(json);
    const buffer = Buffer.alloc(4 + length);
    buffer.writeUInt32BE(length, 0);
    buffer.write(json, 4);
    return buffer;
}

describe("JsonSocket", () => {
    test("socket writes a valid json object", () => {
        const mock = mockSocket();
        const socket = new JsonSocket(mock);

        const obj = { a: 1 };
        socket.write(obj);

        const buffer = toBuffer(obj);
        expect(mock.write.mock.calls.length).toEqual(1);
        expect(mock.write.mock.calls[0][0]).toEqual(buffer);
    });

    test("socket destroys when length greater than max", () => {
        const mock = mockSocket();
        const socket = new JsonSocket(mock);

        const obj = { a: Array(2 ** 18).fill("a") };
        socket.write(obj);

        expect(mock.destroy.mock.calls.length).toEqual(1);
        expect(mock.write.mock.calls.length).toEqual(0);
    });
});
