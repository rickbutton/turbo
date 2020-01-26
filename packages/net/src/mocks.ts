import {
    Config,
    TargetFactory,
    Environment,
    Turbo,
    SessionId,
} from "@turbo/core";

const TEST_ENV: Environment = {
    getVar: (name: string) => {
        if (name === "SHELL") return "conch";
        if (name === "TMUX") return "foobarbaz";
        else return undefined;
    },
    getTmpFolder(context: string) {
        if (context === "sessions") return "/tmp/turbo/sessions";
        throw new Error(context);
    },
    getTmpFile(context: string, name: string) {
        if (context === "sessions" && name === "id")
            return "/tmp/turbo/sessions/id";
        throw new Error(`${context}, ${name}`);
    },
    execSync: jest.fn().mockReturnValueOnce("sessionid"),
    getAllSessionIds(): SessionId[] {
        return ["id"] as SessionId[];
    },
    nodePath: "/tmp/node",
    scriptPath: "/tmp/turbo.js",
    cleanPath: jest.fn(),
    exit: jest.fn(),
};
const TEST_CONFIG: Config = {
    target: {} as TargetFactory,
};
export const TEST_TURBO: Turbo = {
    env: TEST_ENV,
    config: TEST_CONFIG,
    options: {},
};
