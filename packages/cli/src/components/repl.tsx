import { highlight } from "cli-highlight";
import { Client } from "@turbo/net";
import { createLogger } from "@turbo/core";
import React from "react";
import { Static } from "ink";
import { Input } from "./input";
import { ObjectView } from "./object";

const logger = createLogger("repl");
const PROMPT = "> ";

function js(str: string): string {
    return highlight(str, { language: "typescript" });
}

async function handle(
    input: string,
    client: Client,
): Promise<JSX.Element | null> {
    if (/^\s*$/.test(input)) {
        return null;
    }
    const state = client.state;
    if (!state) {
        return null;
    }
    const runtime = state.target.runtime;

    if (input === "/pause") {
        return client.pause().then(() => null);
    } else if (input === "/resume") {
        return client.resume().then(() => null);
    } else if (!runtime.paused) {
        return <span>not paused</span>; // TODO - better error? eval global?
    } else {
        const topCallFrame = runtime.callFrames[0];

        return client
            .eval(input, topCallFrame.id)
            .then(result => {
                if (result.error) {
                    return <span>{result.value}</span>;
                } else if (!result.success) {
                    return result.value.exception ? (
                        <ObjectView
                            simpleExceptions={true}
                            object={result.value.exception}
                        />
                    ) : (
                        <span>{result.value.text}</span>
                    );
                } else {
                    return <ObjectView object={result.value} />;
                }
            })
            .catch(error => {
                return <span>`eval error: ${error}`</span>;
            });
    }
}

interface Props {
    client: Client;
}
export function Repl(props: Props): JSX.Element {
    const [lines, setLines] = React.useState<JSX.Element[]>([]);

    async function onSubmit(value: string): Promise<void> {
        const newLines = [
            ...lines,
            <span key={lines.length}>{PROMPT + js(value)}</span>,
        ];
        setLines(newLines);

        const output = await handle(value, props.client);
        if (output) {
            setLines([
                ...newLines,
                <span key={newLines.length}>{output}</span>,
            ]);
        }
    }

    return (
        <span>
            <Static>{lines}</Static>
            <Input prompt={PROMPT} onSubmit={onSubmit} />
        </span>
    );
}
