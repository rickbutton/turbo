import {
    SessionId,
    generateTmuxStartCommand,
    isInTmux,
    getCurrentSessionId,
} from "./index";
import { Environment, Config, Jug, Layout, TargetFactory } from "@jug/core";

const TEST_ENV: Environment = {
    getVar: (name: string) => {
        if (name === "SHELL") return "conch";
        else return undefined;
    },
    execSync: () => {
        throw new Error();
    },
    nodePath: "/tmp/node",
    scriptPath: "/tmp/jug.js",
};
const TEST_CONFIG: Config = {
    target: {} as TargetFactory,
};
const TEST_JUG: Jug = {
    env: TEST_ENV,
    config: TEST_CONFIG,
};

const POST_CMDS = [
    ";",
    "new-window",
    "-n",
    "daemon",
    "/tmp/node /tmp/jug.js daemon",
    ";",
    "new-window",
    "-n",
    "target",
    "/tmp/node /tmp/jug.js target",
    ";",
    "select-window",
    "-t:0",
    ";",
    "attach",
];

test("generateTmuxStartCommand creates a command for a single pane", () => {
    const id = "id" as SessionId;
    const layout: Layout = {
        windows: [
            {
                name: "test",
                panes: [{ type: "exec", command: "command" }],
            },
        ],
    };

    expect(generateTmuxStartCommand(id, layout, TEST_JUG)).toEqual({
        command: "tmux",
        args: [
            "new-session",
            "-d",
            "-n",
            "test",
            "-s",
            id,
            "command",
            ...POST_CMDS,
        ],
    });
});

test("generateTmuxStartCommand creates a command for multiple panes", () => {
    const id = "id" as SessionId;
    const layout: Layout = {
        windows: [
            {
                name: "test2",
                panes: [
                    { type: "exec", command: "command" },
                    { type: "component", component: "foobar" },
                    { type: "shell" },
                ],
            },
        ],
    };

    expect(generateTmuxStartCommand(id, layout, TEST_JUG)).toEqual({
        command: "tmux",
        args: [
            "new-session",
            "-d",
            "-n",
            "test2",
            "-s",
            id,
            "command",
            ";",
            "split-window",
            "/tmp/node /tmp/jug.js component foobar",
            ";",
            "split-window",
            "conch",
            ...POST_CMDS,
        ],
    });
});

test("generateTmuxStartCommand creates a command for multiple windows", () => {
    const id = "id" as SessionId;
    const layout: Layout = {
        windows: [
            {
                name: "test3",
                panes: [
                    { type: "exec", command: "command" },
                    { type: "component", component: "foobar" },
                    { type: "shell" },
                ],
            },
            {
                name: "test4",
                panes: [
                    { type: "exec", command: "echo 'foo'" },
                    { type: "shell" },
                ],
            },
        ],
    };

    expect(generateTmuxStartCommand(id, layout, TEST_JUG)).toEqual({
        command: "tmux",
        args: [
            "new-session",
            "-d",
            "-n",
            "test3",
            "-s",
            id,
            "command",
            ";",
            "split-window",
            "/tmp/node /tmp/jug.js component foobar",
            ";",
            "split-window",
            "conch",
            ";",
            "new-window",
            "-n",
            "test4",
            "echo 'foo'",
            ";",
            "split-window",
            "conch",
            ...POST_CMDS,
        ],
    });
});

test("isInTmux correctly checks the TMUX var", () => {
    const execSync = jest
        .fn()
        .mockReturnValueOnce("test1\ntest2")
        .mockReturnValueOnce(
            "/dev/pty/test1 notCorrect1\n/dev/pty/test2 notCorrect2",
        )
        .mockReturnValueOnce(
            "/dev/pty/test3 correct1\n/dev/pty/test4 notCorrect3",
        );

    expect(
        isInTmux({
            nodePath: "",
            scriptPath: "",
            getVar(name: string) {
                if (name === "TMUX") return "foobarbaz";
                if (name === "TTY") return "/dev/pty/test3";
                else return undefined;
            },
            execSync,
        }),
    ).toBe(true);

    expect(() =>
        isInTmux({
            nodePath: "",
            scriptPath: "",
            getVar: () => undefined,
            execSync,
        }),
    ).toThrow();
});

test("getCurrentSessionId returns the correct id", () => {
    const execSync = jest
        .fn()
        .mockReturnValueOnce("test1\ntest2")
        .mockReturnValueOnce(
            "/dev/pty/test1 notCorrect1\n/dev/pty/test2 notCorrect2",
        )
        .mockReturnValueOnce(
            "/dev/pty/test3 correct1\n/dev/pty/test4 notCorrect3",
        );

    expect(
        getCurrentSessionId({
            nodePath: "",
            scriptPath: "",
            getVar(name: string) {
                if (name === "TMUX") return "foobarbaz";
                if (name === "TTY") return "/dev/pty/test3";
                else return undefined;
            },
            execSync,
        }),
    ).toBe("correct1");
});
