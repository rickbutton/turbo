import React from "react";
import {
    RemoteObject,
    RemoteObjectProperty,
    RemoteException,
} from "@turbo/core";
import { Box } from "../renderer";
import { useObjectProperties } from "./helpers";

function js(str: string): JSX.Element {
    return <Box>{str}</Box>;
}

function formatString(str: string): JSX.Element {
    const lines = str.split("\n");
    return (
        <Box direction="column">
            {lines.map((l, i) => (
                <Box key={i}>
                    {i === 0 ? '"' : ""}
                    {l}
                    {i === lines.length - 1 ? '"' : ""}
                </Box>
            ))}
        </Box>
    );
}

interface ObjectPropertyProps {
    prop: RemoteObjectProperty;
}
function ObjectProperty(props: ObjectPropertyProps): JSX.Element {
    const prop = props.prop;
    return (
        <Box>
            {prop.name}: {<ObjectView value={prop.value} />}
        </Box>
    );
}

interface ErrorStringOrExceptionProps {
    value: RemoteException | string;
}
function ErrorStringOrException(
    props: ErrorStringOrExceptionProps,
): JSX.Element {
    const { value } = props;
    if (typeof value === "string") {
        return <Box>{value}</Box>;
    } else if (!value.exception) {
        return <Box>{value.text}</Box>;
    } else {
        return <ObjectView value={value.exception} />;
    }
}

const MAX_PROPS_TO_SHOW_WHEN_CLOSED = 5;
interface ObjectTreeProps {
    value: RemoteObject;
}
function ObjectTree(props: ObjectTreeProps): JSX.Element {
    const value = props.value;
    const [open, setOpen] = React.useState(false);

    function toggleOpen(): void {
        setOpen(!open);
    }

    if (value.type === "object") {
        const [loaded, properties, error] = useObjectProperties(value.objectId);

        if (!loaded) {
            // TODO: spinner?
            return <Box>Loading...</Box>;
        }

        if (error) {
            return <ErrorStringOrException value={error} />;
        } else if (properties) {
            const toShow = properties.filter(p => p.name !== "__proto__");
            const showArrow = toShow.length > MAX_PROPS_TO_SHOW_WHEN_CLOSED;

            if (toShow.length === 0) {
                return <Box>{"{}"}</Box>;
            } else {
                const firstProps = toShow.slice(
                    0,
                    MAX_PROPS_TO_SHOW_WHEN_CLOSED,
                );
                const restProps = toShow.slice(MAX_PROPS_TO_SHOW_WHEN_CLOSED);
                return (
                    <Box direction="column">
                        <Box onClick={toggleOpen}>
                            {firstProps.map((p, i) => (
                                <Box key={i}>
                                    {i === 0 && showArrow && !open ? "► " : ""}
                                    {i === 0 && showArrow && open ? "▼ " : ""}
                                    {i === 0 ? "{ " : "  "}
                                    <ObjectProperty prop={p} />
                                    {i === firstProps.length - 1
                                        ? showArrow
                                            ? open
                                                ? ""
                                                : " …}"
                                            : " }"
                                        : ""}
                                </Box>
                            ))}
                        </Box>
                        {showArrow && open ? (
                            <Box direction="column" marginLeft={4}>
                                {restProps.map((p, i) => (
                                    <Box key={i}>
                                        <ObjectProperty prop={p} />
                                        {i === restProps.length - 1 ? " }" : ""}
                                    </Box>
                                ))}
                            </Box>
                        ) : null}
                    </Box>
                );
            }
        }
    }
    return <Box></Box>;
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
    } else if (
        typeof value.subtype !== "undefined" &&
        value.subtype.length > 0
    ) {
        return <Box>{`[${value.className} ${value.type}]`}</Box>;
    } else {
        return <ObjectTree value={value} />;
    }
}

interface ObjectViewProps {
    simpleExceptions?: boolean;
    value: RemoteObject;
}
export function ObjectView(props: ObjectViewProps): JSX.Element {
    const { simpleExceptions, value } = props;

    if (value.type === "string") return formatString(value.value);
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
