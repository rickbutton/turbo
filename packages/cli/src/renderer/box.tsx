import React from "react";
import { NodeStyle } from "./style";
import { MouseEvent } from "./buffertarget";
// eslint-disable-next-line @typescript-eslint/camelcase
import { unstable_calculateTextHeight } from ".";

interface BoxProps {
    orientation?: "horizontal" | "vertical";
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
    scrollable?: boolean;

    wrap?: boolean;
    onClick?(event: MouseEvent): void;
    onMouse?(event: MouseEvent): void;

    children?: React.ReactNode;
}

function useYoga(ref: React.RefObject<any>): any {
    const [yoga, setYoga] = React.useState<any>();
    React.useEffect(() => {
        if (ref.current) {
            setYoga(ref.current.yoga);
        } else {
            setYoga(null);
        }
    });
    return yoga;
}
function useSize(ref: React.RefObject<any>): { width: number; height: number } {
    const yoga = useYoga(ref);
    if (yoga) {
        return {
            width: yoga.getComputedWidth(),
            height: yoga.getComputedHeight(),
        };
    } else {
        return {
            width: 0,
            height: 0,
        };
    }
}

export const Box = React.forwardRef(function InternalBox(
    props: BoxProps,
    ref: React.Ref<any>,
): JSX.Element {
    const contentRef = React.useRef<any>();
    const viewportRef = React.useRef<any>();

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
    const contentProps = {
        orientation: props.orientation,
        wrap: props.wrap,
        onClick: props.onClick,
        onMouse: props.onMouse,
        style,
        ref,
    };
    const content = props.children;
    const element = React.createElement("div", contentProps, content);

    const viewportSize = useSize(viewportRef);
    const [viewportOffset, setViewportOffset] = React.useState(0);

    if (props.scrollable) {
        const contentHeight = React.useMemo(
            () =>
                contentRef.current
                    ? unstable_calculateTextHeight(
                          contentRef.current.children[0],
                          viewportSize.width,
                      )
                    : 0,
            [contentRef.current, viewportSize.width],
        );
        const barLength = Math.max(0, contentHeight - viewportSize.height);

        function onMouse(event: MouseEvent): void {
            if (event.button === "wheel-up") {
                setViewportOffset(Math.max(viewportOffset - 1, 0));
            } else if (event.button === "wheel-down") {
                setViewportOffset(
                    Math.min(
                        viewportOffset + 1,
                        viewportSize.height - barLength,
                    ),
                );
            }
        }

        return (
            <Box scrollable={false} ref={viewportRef} onMouse={onMouse}>
                <Box {...props} direction="column" grow={1} scrollable={false}>
                    <Box
                        grow={1}
                        direction="column"
                        scrollable={false}
                        ref={contentRef}
                    >
                        {element}
                    </Box>
                </Box>
                <Box
                    width={1}
                    scrollable={false}
                    orientation="vertical"
                    direction="column"
                >
                    {Array(viewportOffset)
                        .fill(" ")
                        .join("")}
                    {Array(barLength)
                        .fill("┃")
                        .join("")}
                </Box>
            </Box>
        );
    } else {
        return element;
    }
});
