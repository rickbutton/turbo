import { highlight } from "cli-highlight";
import React from "react";
import { RemoteObject } from "@turbo/core";
import chalk from "chalk";

function js(str: string): JSX.Element {
    return <span>{highlight(str, { language: "typescript" })}</span>;
}

interface ComplexObjectProps {
    simpleExceptions: boolean;
    object: RemoteObject;
}
function ComplexObject(props: ComplexObjectProps): JSX.Element {
    const { simpleExceptions, object } = props;
    if (object.type !== "object") {
        return <span>unknown type ${object["type"]}</span>;
    }

    // TODO: array, node, regexp, date, map, set, weapmap, weakset,
    // iterator, generator, proxy, typedarray, arraybuffer, dataview
    if (object.subtype === "error") {
        const text = simpleExceptions
            ? object.description.split("\n")[0]
            : object.description;
        return <span>{chalk.red(text)}</span>;
    } else if (object.subtype === "null") {
        return <span>{js("null")}</span>;
    } else {
        return <span>{`[${object.className} ${object.type}]`}</span>;
    }
}

interface ObjectViewProps {
    simpleExceptions?: boolean;
    object: RemoteObject;
}
export function ObjectView(props: ObjectViewProps): JSX.Element {
    const { simpleExceptions, object } = props;

    if (object.type === "string") return js('"' + object.value + '"');
    if (object.type === "number") return js(object.description);
    if (object.type === "boolean") return js(String(object.value));
    if (object.type === "symbol") return js(object.description);
    if (object.type === "bigint") return js(object.description);
    if (object.type === "undefined") return js("undefined");
    if (object.type === "function") return js("function"); // TODO: expand
    if (object.type === "object")
        return (
            <ComplexObject
                simpleExceptions={simpleExceptions || false}
                object={object}
            />
        );

    return <span>unknown type ${object["type"]}</span>;
}
