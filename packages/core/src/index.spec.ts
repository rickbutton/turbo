import { mocked } from "ts-jest/utils";
import { getJug, EmitterBase } from "./index";
import * as fs from "fs";
import * as path from "path";
import * as child from "child_process";

jest.mock("child_process", () => ({
    execSync: jest.fn().mockImplementation((command: string) => {
        return Buffer.from(`FOO${command}BAR`, "utf8");
    }),
}));
jest.mock("process", () => ({
    argv: ["/tmp/foo/node", "/tmp/foo/myScript.js"],
    cwd: (): string => {
        return "/tmp/exists/foo/bar/baz/";
    },
    env: {
        FOO: "BAR",
        foo: "bar",
        BAR: "BAZ",
    },
}));
jest.mock("fs", () => ({
    existsSync: jest.fn().mockImplementation((p: fs.PathLike) => {
        const resolved = path.resolve(p.toString());
        if (resolved === "/tmp/exists/jug.config.js") return true;
        return false;
    }),
}));
jest.mock(
    "/tmp/exists/jug.config.js",
    () => ({
        target: {},
    }),
    { virtual: true },
);

describe("Jug", () => {
    beforeEach(() => {
        mocked(child.execSync).mockClear();
        mocked(fs.existsSync).mockClear();
    });

    describe("env", () => {
        test("getVar returns environment variables", () => {
            const jug = getJug();
            expect(jug.env.getVar("FOO")).toBe("BAR");
            expect(jug.env.getVar("foo")).toBe("bar");
            expect(jug.env.getVar("BAR")).toBe("BAZ");
            expect(jug.env.getVar("FAIL")).toBe(undefined);
        });

        describe("nodePath returns the correct path", () => {
            process.argv[0] = "/tmp/foo/node";
            const jug = getJug();
            expect(jug.env.nodePath).toBe("/tmp/foo/node");
        });

        describe("scriptPath returns the correct path", () => {
            process.argv[1] = "/tmp/foo/myScript.js";
            const jug = getJug();
            expect(jug.env.scriptPath).toBe("/tmp/foo/myScript.js");
        });

        describe("execSync invokes the command and returns the stdout", () => {
            const jug = getJug();
            expect(jug.env.execSync("TEST")).toBe("FOOTESTBAR");
            expect(jug.env.execSync("test test")).toBe("FOOtest testBAR");
            expect(mocked(child.execSync).mock.calls.length).toBe(2);
        });
    });
    describe("config", () => {
        test("getConfig looks for the config file with the correct resolution order", () => {
            const _ = getJug();

            expect(mocked(fs.existsSync).mock.calls).toEqual([
                ["/tmp/exists/foo/bar/baz/jug.config.js"],
                ["/tmp/exists/foo/bar/jug.config.js"],
                ["/tmp/exists/foo/jug.config.js"],
                ["/tmp/exists/jug.config.js"],
            ]);
        });
    });
});

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
