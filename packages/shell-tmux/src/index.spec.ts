jest.mock("ffi-napi");
jest.mock("ref-napi");
jest.mock("ref-array-di");

import { generateTmuxStartCommand } from "./index";
import { SessionId, Environment, Config, Turbo, Layout } from "@turbo/core";

function createConfig(): Config {
    return {
        target: "node",
        shell: "tmux",
    };
}

function createEnv(inTmux = false): Environment {
    return {
        getVar: (name: string): string | undefined => {
            if (name === "SHELL") return "conch";
            if (name === "TMUX" && inTmux) return "session";
            else return undefined;
        },
        getTmpFolder(): string {
            return "";
        },
        getTmpFile(): string {
            return "";
        },
        getAllSessionIds(): SessionId[] {
            if (inTmux) {
                return ["session"] as SessionId[];
            } else {
                return [] as SessionId[];
            }
        },
        execSync: jest.fn().mockReturnValueOnce("sessionid"),
        nodePath: "/tmp/node",
        scriptPath: "/tmp/turbo.js",
        cleanPath: jest.fn(),
        require: jest.fn(),
        readFile: jest.fn(),
        exit: jest.fn(),
    };
}

function createTurbo(env: Environment, config: Config): Turbo {
    return { env, config, options: {} };
}

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

    const turbo = createTurbo(createEnv(), createConfig());
    expect(generateTmuxStartCommand(id, layout, turbo)).toEqual({
        command: "tmux",
        args: [
            "new-session",
            "-d",
            "-n",
            "id:test",
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

    const turbo = createTurbo(createEnv(), createConfig());
    expect(generateTmuxStartCommand(id, layout, turbo)).toEqual({
        command: "tmux",
        args: [
            "new-session",
            "-d",
            "-n",
            "id:test2",
            "-s",
            id,
            "command",
            ";",
            "split-window",
            "/tmp/node /tmp/turbo.js --session id component foobar",
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

    const turbo = createTurbo(createEnv(), createConfig());
    expect(generateTmuxStartCommand(id, layout, turbo)).toEqual({
        command: "tmux",
        args: [
            "new-session",
            "-d",
            "-n",
            "id:test3",
            "-s",
            id,
            "command",
            ";",
            "split-window",
            "/tmp/node /tmp/turbo.js --session id component foobar",
            ";",
            "split-window",
            "conch",
            ";",
            "new-window",
            "-a",
            "-n",
            "id:test4",
            "echo 'foo'",
            ";",
            "split-window",
            "conch",
            ...POST_CMDS,
        ],
    });
});
