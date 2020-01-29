import { getTurbo } from "./turbo";
import { mocked } from "ts-jest/utils";
import fs from "fs";
import path from "path";
import child from "child_process";
import { getCurrentSessionId } from "@turbo/core";

jest.mock("child_process", () => ({
    execSync: jest.fn().mockImplementation((command: string) => {
        return Buffer.from(`FOO${command}BAR`, "utf8");
    }),
}));
jest.mock("os", () => ({
    homedir: jest.fn().mockReturnValue("/home/user"),
}));
jest.mock("process", () => ({
    argv: ["/tmp/foo/node", "/tmp/foo/myScript.js"],
    cwd: jest.fn().mockReturnValue("/tmp/exists/foo/bar/baz/"),
    env: {
        FOO: "BAR",
        foo: "bar",
        BAR: "BAZ",
    },
}));
const FILES: { [key: string]: string } = {
    "/home/user/.turbo.config.json": JSON.stringify({ one: "one", two: "two" }),
    "/tmp/exists/foo/bar/baz/turbo.config.json": JSON.stringify({
        three: "three",
        one: "three",
    }),
    "/tmp/exists/foo/turbo.config.json": JSON.stringify({
        three: "four",
    }),
    "/tmp/exists/turbo.config.json": JSON.stringify({
        five: "five",
    }),
    "/turbo.config.json": JSON.stringify({
        two: null,
    }),
};
jest.mock("fs", () => ({
    existsSync: jest.fn().mockImplementation((p: fs.PathLike) => {
        const resolved = path.resolve(p.toString());
        if (FILES[resolved]) return true;
        if (resolved === "/tmp/turbo/sessions") return true;
        return false;
    }),
    readFileSync: jest.fn().mockImplementation((p: fs.PathLike) => {
        const resolved = path.resolve(p.toString());
        if (FILES[resolved]) return FILES[resolved];
        throw new Error();
    }),
    readdirSync: jest.fn().mockImplementation((p: fs.PathLike) => {
        const resolved = path.resolve(p.toString());
        if (resolved === "/tmp/turbo/sessions")
            return ["/tmp/turbo/sessions/session"];
        return [];
    }),
}));
jest.mock(
    "/tmp/exists/turbo.config.js",
    () => ({
        target: "node",
        shell: "tmux",
    }),
    { virtual: true },
);

describe("Turbo", () => {
    beforeEach(() => {
        mocked(child.execSync).mockClear();
        mocked(fs.existsSync).mockClear();
    });

    describe("env", () => {
        test("getVar returns environment variables", () => {
            const turbo = getTurbo({});
            expect(turbo.env.getVar("FOO")).toBe("BAR");
            expect(turbo.env.getVar("foo")).toBe("bar");
            expect(turbo.env.getVar("BAR")).toBe("BAZ");
            expect(turbo.env.getVar("FAIL")).toBe(undefined);
        });

        describe("nodePath returns the correct path", () => {
            process.argv[0] = "/tmp/foo/node";
            const turbo = getTurbo({});
            expect(turbo.env.nodePath).toBe("/tmp/foo/node");
        });

        describe("scriptPath returns the correct path", () => {
            process.argv[1] = "/tmp/foo/myScript.js";
            const turbo = getTurbo({});
            expect(turbo.env.scriptPath).toBe("/tmp/foo/myScript.js");
        });

        describe("execSync invokes the command and returns the stdout", () => {
            const turbo = getTurbo({});
            expect(turbo.env.execSync("TEST")).toBe("FOOTESTBAR");
            expect(turbo.env.execSync("test test")).toBe("FOOtest testBAR");
            expect(mocked(child.execSync).mock.calls.length).toBe(2);
        });
    });
    describe("config", () => {
        test("getConfig looks for the config file with the correct resolution order", () => {
            const _ = getTurbo({});

            expect(mocked(fs.existsSync).mock.calls).toEqual([
                ["/home/user/.turbo.config.json"],
                ["/tmp/exists/foo/bar/baz/turbo.config.json"],
                ["/tmp/exists/foo/bar/turbo.config.json"],
                ["/tmp/exists/foo/turbo.config.json"],
                ["/tmp/exists/turbo.config.json"],
                ["/tmp/turbo.config.json"],
                ["/turbo.config.json"],
            ]);
        });
        test("getConfig merges the configuration in the correct resolution order", () => {
            const _ = getTurbo({});
            const output = _.config as any;

            expect(Object.keys(output)).toEqual([
                "target",
                "shell",
                "one",
                "two",
                "three",
                "five",
            ]);
            expect(output).toEqual({
                target: "node",
                shell: "tmux",
                one: "three",
                two: null,
                three: "four",
                five: "five",
            });
        });

        test("getCurrentSessionId returns the correct id", () => {
            const turbo = getTurbo({});
            expect(getCurrentSessionId(turbo)).toBe("session");
        });
    });
});
