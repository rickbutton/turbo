import { generateTmuxStartCommand, getCurrentSessionId } from "./index";
import {
    SessionId,
    Environment,
    Config,
    Turbo,
    Layout,
    TargetFactory,
} from "@turbo/core";

const TEST_ENV: Environment = {
    getVar: (name: string) => {
        if (name === "SHELL") return "conch";
        if (name === "TMUX") return "foobarbaz";
        else return undefined;
    },
    getTmpFolder() {
        return "";
    },
    getTmpFile() {
        return "";
    },
    execSync: jest.fn().mockReturnValueOnce("sessionid"),
    nodePath: "/tmp/node",
    scriptPath: "/tmp/turbo.js",
};
const TEST_CONFIG: Config = {
    target: {} as TargetFactory,
};
const TEST_TURBO: Turbo = {
    env: TEST_ENV,
    config: TEST_CONFIG,
    options: {},
};

const POST_CMDS = [";", "select-window", "-t:0", ";", "attach"];

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

    expect(generateTmuxStartCommand(id, layout, TEST_TURBO)).toEqual({
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

    expect(generateTmuxStartCommand(id, layout, TEST_TURBO)).toEqual({
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
            "/tmp/node /tmp/turbo.js component foobar",
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

    expect(generateTmuxStartCommand(id, layout, TEST_TURBO)).toEqual({
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
            "/tmp/node /tmp/turbo.js component foobar",
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

test("getCurrentSessionId returns the correct id", () => {
    expect(getCurrentSessionId(TEST_TURBO)).toBe("sessionid");
});
