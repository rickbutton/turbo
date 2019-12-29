import React from "react";
import { NodeStyle } from "./style";

interface MouseEvent {
    x: number;
    y: number;
}

interface BoxProps {
    grow?: number;
    shrink?: number;
    basis?: number | "string";
    direction?: "row" | "column";
    alignItems?: "stretch" | "flex-start" | "flex-end" | "center" | "baseline";
    justify?:
        | "flex-start"
        | "flex-end"
        | "center"
        | "space-between"
        | "space-around"
        | "space-evenly";
    height?: number | string;
    width?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;
    minWidth?: number | string;
    maxWidth?: number | string;

    wrap?: boolean;
    onClick?(event: MouseEvent): void;

    children?: React.ReactNode;
}

export const Box = React.forwardRef(function Box(
    props: BoxProps,
    ref: React.Ref<any>,
): JSX.Element {
    const style: NodeStyle = {
        flexGrow: props.grow,
        flexShrink: props.shrink !== undefined ? props.shrink : 1,
        flexBasis: props.basis,
        flexDirection: props.direction || "row",
        alignItems: props.alignItems,
        justifyContent: props.justify,
        height: props.height,
        width: props.width,
        minHeight: props.minHeight,
        maxHeight: props.maxHeight,
        minWidth: props.minWidth,
        maxWidth: props.maxWidth,
    };
    return React.createElement(
        "div",
        {
            wrap: props.wrap,
            onClick: props.onClick,
            ref,
            style,
        },
        props.children,
    );
});
