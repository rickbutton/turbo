import React from "react";
import {
    RemoteObject,
    RemoteObjectProperty,
    RemoteException,
    logger,
} from "@turbo/core";
import { Box } from "../renderer";
import { useObjectProperties, highlightJs } from "./helpers";

function js(str: string): JSX.Element {
    return <Box>{highlightJs(str)}</Box>;
}

function formatString(str: string): JSX.Element {
    const lines = str.split("\n");
    return (
        <Box direction="column" height={lines.length}>
            {lines.map((l, i) => (
                <Box key={i} height={1}>
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
    simple: boolean;
    seenGlobal: boolean;
}
function ObjectProperty(props: ObjectPropertyProps): JSX.Element {
    const { prop, simple, seenGlobal } = props;
    return (
        <Box>
            {prop.name}:{" "}
            {
                <ObjectView
                    value={prop.value}
                    simple={simple}
                    seenGlobal={seenGlobal}
                />
            }
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

const MAX_PROPS_TO_SHOW_WHEN_CLOSED = 2;
interface ObjectTreeProps {
    value: RemoteObject;
    simple: boolean;
    seenGlobal: boolean;
}
function ObjectTree(props: ObjectTreeProps): JSX.Element {
    const { value, seenGlobal } = props;

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

            if (toShow.length === 0) {
                return <Box>{"{}"}</Box>;
            } else {
                const firstProps = toShow.slice(
                    0,
                    MAX_PROPS_TO_SHOW_WHEN_CLOSED,
                );
                return (
                    <Box direction="column">
                        <Box onClick={toggleOpen}>
                            {firstProps.map((p, i) => (
                                <Box key={i}>
                                    {i === 0 ? (open ? "▼ { " : "▶ { ") : " "}
                                    {!open ? (
                                        <ObjectProperty
                                            prop={p}
                                            simple={true}
                                            seenGlobal={seenGlobal}
                                        />
                                    ) : null}
                                </Box>
                            ))}
                            {!open &&
                            toShow.length > MAX_PROPS_TO_SHOW_WHEN_CLOSED
                                ? " …"
                                : " "}
                            {!open ? "}" : ""}
                        </Box>
                        {open ? (
                            <Box direction="column">
                                {toShow.map((p, i) => (
                                    <Box key={i} marginLeft={4}>
                                        <ObjectProperty
                                            prop={p}
                                            simple={true}
                                            seenGlobal={seenGlobal}
                                        />
                                    </Box>
                                ))}
                                {open ? "}" : ""}
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
    value: RemoteObject;
    simple: boolean;
    seenGlobal: boolean;
}
function ComplexObject(props: ComplexObjectProps): JSX.Element {
    const { simple, value, seenGlobal } = props;
    if (value.type !== "object") {
        return <Box>unknown type ${value["type"]}</Box>;
    }

    // TODO: array, node, regexp, date, map, set, weapmap, weakset,
    // iterator, generator, proxy, typedarray, arraybuffer, dataview
    if (value.subtype === "error") {
        const text = simple
            ? value.description.split("\n")[0]
            : value.description;
        return <Box color="red">{text}</Box>;
    } else if (value.subtype === "null") {
        return js("null");
    } else if (simple) {
        const name = value.className === "Object" ? "{}" : value.className;
        return <Box>{name}</Box>;
    } else if (value.className === "global") {
        return seenGlobal ? (
            <Box>globalThis</Box>
        ) : (
            <ObjectTree value={value} simple={simple} seenGlobal={true} />
        );
    } else if (
        typeof value.subtype !== "undefined" &&
        value.subtype.length > 0
    ) {
        return <Box>{`[${value.className} ${value.type}]`}</Box>;
    } else {
        return (
            <ObjectTree value={value} simple={simple} seenGlobal={seenGlobal} />
        );
    }
}

interface FunctionObjectProps {
    value: RemoteObject;
    simple: boolean;
}
function FunctionObject(props: FunctionObjectProps): JSX.Element {
    const { value, simple } = props;
    if (value.type !== "function") {
        return <Box>unknown type ${value["type"]}</Box>;
    }
    const [loaded, properties, error] = useObjectProperties(value.objectId);
    const nameProp = properties
        ? properties.find(p => p.name === "name")
        : undefined;
    const lines = React.useMemo(
        () => highlightJs(value.description).split("\n"),
        [value.description],
    );

    if (simple) {
        if (!loaded || error || !nameProp || nameProp.value.type !== "string") {
            return <Box>{highlightJs("function")}</Box>;
        } else {
            return (
                <Box maxHeight={1}>
                    {highlightJs(`function ${nameProp.value.value}()`)}
                </Box>
            );
        }
    } else {
        return <Box direction="column">{lines}</Box>;
    }
}

interface ObjectViewProps {
    simple?: boolean;
    seenGlobal?: boolean;
    value: RemoteObject;
}
export function ObjectView(props: ObjectViewProps): JSX.Element {
    const { simple = false, seenGlobal = false, value } = props;

    if (value.type === "string") return formatString(value.value);
    if (value.type === "number") return js(value.description);
    if (value.type === "boolean") return js(String(value.value));
    if (value.type === "symbol") return js(value.description);
    if (value.type === "bigint") return js(value.description);
    if (value.type === "undefined") return js("undefined");
    if (value.type === "function")
        return <FunctionObject value={value} simple={simple} />;
    if (value.type === "object")
        return (
            <ComplexObject
                simple={simple}
                value={value}
                seenGlobal={seenGlobal}
            />
        );

    return <Box>unknown type ${value["type"]}</Box>;
}
