import React from "react";
import { ObjectView } from "./object";
import { Box } from "../renderer";
import { EvalResponse } from "@turbo/core";

interface EvalProps {
    result: EvalResponse;
}
export function Eval(props: EvalProps): JSX.Element {
    const { result } = props;

    if (result.error) {
        if (typeof result.value === "string") {
            return <Box>{result.value}</Box>;
        } else if (result.value.exception) {
            return <ObjectView simple={true} value={result.value.exception} />;
        } else {
            return <Box>{result.value.text}</Box>;
        }
    } else {
        // TODO why is this broken???
        return <ObjectView value={result.value as any} />;
    }
}
