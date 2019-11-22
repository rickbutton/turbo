import { EmitterBase } from "./emitter";

describe("EmitterBase", () => {
    test("EmitterBase correctly fires events that have been listened for", () => {
        interface TestEmitterEvents {
            foo: string;
            bar: number;
        }
        class EmitterTest extends EmitterBase<TestEmitterEvents> {}

        const emitter = new EmitterTest();

        const foo1 = jest.fn();
        const foo2 = jest.fn();

        const bar1 = jest.fn();

        emitter.fire("foo", "this shouldn't fire");
        emitter.fire("bar", 123);

        emitter.on("foo", foo1);
        emitter.on("foo", foo2);
        emitter.on("bar", bar1);

        emitter.fire("foo", "this is an event");
        emitter.fire("foo", "this is an event 2");
        emitter.fire("bar", 123);

        emitter.off("foo", foo1);

        emitter.fire("foo", "this is an event 3");

        expect(foo1.mock.calls.length).toBe(2);
        expect(foo1.mock.calls[0]).toEqual(["this is an event"]);
        expect(foo1.mock.calls[1]).toEqual(["this is an event 2"]);

        expect(foo2.mock.calls.length).toBe(3);
        expect(foo2.mock.calls[0]).toEqual(["this is an event"]);
        expect(foo2.mock.calls[1]).toEqual(["this is an event 2"]);
        expect(foo2.mock.calls[2]).toEqual(["this is an event 3"]);

        expect(bar1.mock.calls.length).toBe(1);
        expect(bar1.mock.calls[0]).toEqual([123]);
    });
});
