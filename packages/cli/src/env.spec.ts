import { getEnvironment } from "./env";
import { mocked } from "ts-jest/utils";
import fs from "fs";
import path from "path";
import child from "child_process";

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
        if (resolved === "/tmp/exists/turbo.config.js") return true;
        return false;
    }),
}));
jest.mock(
    "/tmp/exists/turbo.config.js",
    () => ({
        target: {},
    }),
    { virtual: true },
);

describe("env", () => {
    beforeEach(() => {
        mocked(child.execSync).mockClear();
        mocked(fs.existsSync).mockClear();
    });

    describe("env", () => {
        test("getVar returns environment variables", () => {
            const env = getEnvironment({});
            expect(env.host.getVar("FOO")).toBe("BAR");
            expect(env.host.getVar("foo")).toBe("bar");
            expect(env.host.getVar("BAR")).toBe("BAZ");
            expect(env.host.getVar("FAIL")).toBe(undefined);
        });

        describe("nodePath returns the correct path", () => {
            process.argv[0] = "/tmp/foo/node";
            const env = getEnvironment({});
            expect(env.host.nodePath).toBe("/tmp/foo/node");
        });

        describe("scriptPath returns the correct path", () => {
            process.argv[1] = "/tmp/foo/myScript.js";
            const env = getEnvironment({});
            expect(env.host.scriptPath).toBe("/tmp/foo/myScript.js");
        });

        describe("execSync invokes the command and returns the stdout", () => {
            const env = getEnvironment({});
            expect(env.host.execSync("TEST")).toBe("FOOTESTBAR");
            expect(env.host.execSync("test test")).toBe("FOOtest testBAR");
            expect(mocked(child.execSync).mock.calls.length).toBe(2);
        });
    });
    describe("config", () => {
        test("getConfig looks for the config file with the correct resolution order", () => {
            const _ = getEnvironment({});

            expect(mocked(fs.existsSync).mock.calls).toEqual([
                ["/tmp/exists/foo/bar/baz/turbo.config.js"],
                ["/tmp/exists/foo/bar/turbo.config.js"],
                ["/tmp/exists/foo/turbo.config.js"],
                ["/tmp/exists/turbo.config.js"],
            ]);
        });
    });
});
