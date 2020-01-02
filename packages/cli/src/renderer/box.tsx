import React from "react";
import { NodeStyle } from "./style";
import { MouseEvent } from "./buffertarget";

export interface BoxProps {
    textDirection?: "horizontal" | "vertical";
    grow?: number;
    shrink?: number;
    basis?: number | string;
    direction?: "row" | "column" | "row-reverse" | "column-reverse";
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

    color?: string | number;
    bg?: string | number;

    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;

    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;

    drawOffsetTop?: number;
    drawOffsetLeft?: number;
    drawOverflow?: boolean;
    wrap?: boolean;
    onClick?(event: MouseEvent): void;
    onMouse?(event: MouseEvent): void;

    children?: React.ReactNode;
}

export const Box = React.forwardRef(function InternalBox(
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
        marginTop: props.marginTop,
        marginBottom: props.marginBottom,
        marginLeft: props.marginLeft,
        marginRight: props.marginRight,
        paddingTop: props.paddingTop,
        paddingBottom: props.paddingBottom,
        paddingLeft: props.paddingLeft,
        paddingRight: props.paddingRight,
    };
    const contentProps = {
        textDirection: props.textDirection,
        wrap: props.wrap,
        drawOffsetTop: props.drawOffsetTop,
        drawOffsetLeft: props.drawOffsetLeft,
        drawOverflow: props.drawOverflow,
        color: props.color,
        bg: props.bg,
        onClick: props.onClick,
        onMouse: props.onMouse,
        style,
        ref,
    };
    const content = props.children;
    const element = React.createElement("div", contentProps, content);

    return element;
});
