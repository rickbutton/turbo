declare module "node-color-readline" {
    import * as readline from "readline";

    interface CreateInterfaceOptions {
        input: typeof process.stdin;
        output: typeof process.stdout;
        colorize?: (str: string) => string;
        suggest?: () => string;
    }
    export const createInterface: (
        options: CreateInterfaceOptions,
    ) => readline.Interface;
}
