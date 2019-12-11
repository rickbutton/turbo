import { mocked } from "ts-jest/utils";
import { getTurbo } from "./index";
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

describe("Turbo", () => {
    beforeEach(() => {
        mocked(child.execSync).mockClear();
        mocked(fs.existsSync).mockClear();
    });

    describe("env", () => {
        test("getVar returns environment variables", () => {
            const turbo = getTurbo();
            expect(turbo.env.getVar("FOO")).toBe("BAR");
            expect(turbo.env.getVar("foo")).toBe("bar");
            expect(turbo.env.getVar("BAR")).toBe("BAZ");
            expect(turbo.env.getVar("FAIL")).toBe(undefined);
        });

        describe("nodePath returns the correct path", () => {
            process.argv[0] = "/tmp/foo/node";
            const turbo = getTurbo();
            expect(turbo.env.nodePath).toBe("/tmp/foo/node");
        });

        describe("scriptPath returns the correct path", () => {
            process.argv[1] = "/tmp/foo/myScript.js";
            const turbo = getTurbo();
            expect(turbo.env.scriptPath).toBe("/tmp/foo/myScript.js");
        });

        describe("execSync invokes the command and returns the stdout", () => {
            const turbo = getTurbo();
            expect(turbo.env.execSync("TEST")).toBe("FOOTESTBAR");
            expect(turbo.env.execSync("test test")).toBe("FOOtest testBAR");
            expect(mocked(child.execSync).mock.calls.length).toBe(2);
        });
    });
    describe("config", () => {
        test("getConfig looks for the config file with the correct resolution order", () => {
            const _ = getTurbo();

            expect(mocked(fs.existsSync).mock.calls).toEqual([
                ["/tmp/exists/foo/bar/baz/turbo.config.js"],
                ["/tmp/exists/foo/bar/turbo.config.js"],
                ["/tmp/exists/foo/turbo.config.js"],
                ["/tmp/exists/turbo.config.js"],
            ]);
        });
    });
});
