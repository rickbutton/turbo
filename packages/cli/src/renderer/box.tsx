import React from "react";
import { NodeStyle } from "./style";
import { MouseEvent } from "./buffertarget";

type Direction = "row" | "column" | "row-reverse" | "column-reverse";
export interface BoxProps {
    grow?: number;
    shrink?: number;
    basis?: number | string;
    direction?: Direction;
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
    let minHeight: string | number | undefined;
    let minWidth: string | number | undefined;

    const flexDirection: Direction = props.direction || "row";
    if (flexDirection === "row" || flexDirection === "row-reverse") {
        minHeight =
            typeof props.minHeight !== "undefined" ? props.minHeight : 1;
    } else {
        minWidth = typeof props.minWidth !== "undefined" ? props.minWidth : 1;
    }

    const style: NodeStyle = {
        flexGrow: props.grow,
        flexShrink: props.shrink !== undefined ? props.shrink : 1,
        flexBasis: props.basis,
        flexDirection: flexDirection,
        alignItems: props.alignItems,
        justifyContent: props.justify,
        height: props.height,
        width: props.width,
        minHeight: minHeight,
        maxHeight: props.maxHeight,
        minWidth: minWidth,
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
    const element = React.createElement("div", contentProps, props.children);

    return element;
});
