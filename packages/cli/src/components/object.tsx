import React from "react";
import { RemoteObject } from "@turbo/core";
import { Box } from "../renderer";

function js(str: string): JSX.Element {
    return <Box>{str}</Box>;
}

interface ComplexObjectProps {
    simpleExceptions: boolean;
    value: RemoteObject;
}
function ComplexObject(props: ComplexObjectProps): JSX.Element {
    const { simpleExceptions, value } = props;
    if (value.type !== "object") {
        return <Box>unknown type ${value["type"]}</Box>;
    }

    // TODO: array, node, regexp, date, map, set, weapmap, weakset,
    // iterator, generator, proxy, typedarray, arraybuffer, dataview
    if (value.subtype === "error") {
        const text = simpleExceptions
            ? value.description.split("\n")[0]
            : value.description;
        return <Box color="red">{text}</Box>;
    } else if (value.subtype === "null") {
        return js("null");
    } else {
        return <Box>{`[${value.className} ${value.type}]`}</Box>;
    }
}

interface ObjectViewProps {
    simpleExceptions?: boolean;
    value: RemoteObject;
}
export function ObjectView(props: ObjectViewProps): JSX.Element {
    const { simpleExceptions, value } = props;

    if (value.type === "string") return js('"' + value.value + '"');
    if (value.type === "number") return js(value.description);
    if (value.type === "boolean") return js(String(value.value));
    if (value.type === "symbol") return js(value.description);
    if (value.type === "bigint") return js(value.description);
    if (value.type === "undefined") return js("undefined");
    if (value.type === "function") return js("function"); // TODO: expand
    if (value.type === "object")
        return (
            <ComplexObject
                simpleExceptions={simpleExceptions || false}
                value={value}
            />
        );

    return <Box>unknown type ${value["type"]}</Box>;
}
