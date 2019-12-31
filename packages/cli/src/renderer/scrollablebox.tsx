import React from "react";
import { Box, BoxProps, MouseEvent } from ".";
// eslint-disable-next-line @typescript-eslint/camelcase
import { unstable_calculateTextHeight } from ".";

function useSize(ref: React.RefObject<any>): { width: number; height: number } {
    const [width, setWidth] = React.useState(0);
    const [height, setHeight] = React.useState(0);

    React.useEffect(() => {
        if (ref.current) {
            const newWidth = ref.current.yoga.getComputedWidth();
            const newHeight = ref.current.yoga.getComputedHeight();
            setWidth(newWidth);
            setHeight(newHeight);
        } else {
            setWidth(0);
            setHeight(0);
        }
    });
    return {
        width,
        height,
    };
}

export function ScrollableBox(props: BoxProps): JSX.Element {
    const contentRef = React.useRef<any>();
    const viewportRef = React.useRef<any>();
    const viewport = useSize(viewportRef);

    const [contentHeight, setContentHeight] = React.useState(0);
    const [viewportOffset, setViewportOffset] = React.useState(0);
    const [barHeight, setBarHeight] = React.useState(0);

    const minViewportOffset = 0;
    const maxViewportOffset = Math.max(0, contentHeight - viewport.height + 1);

    React.useLayoutEffect(() => {
        if (contentRef.current && viewport.width !== 0) {
            const height = unstable_calculateTextHeight(
                contentRef.current,
                viewport.width,
            );
            setContentHeight(height);
        }
    }, [props.children, contentRef.current, viewport.width]);

    React.useLayoutEffect(() => {
        updateViewportOffset(viewportOffset);
        updateBarHeight();
    }, [viewport.height, contentHeight]);

    function updateViewportOffset(offset: number): void {
        if (offset < minViewportOffset) {
            setViewportOffset(minViewportOffset);
        } else if (offset > maxViewportOffset) {
            setViewportOffset(maxViewportOffset);
        } else {
            setViewportOffset(offset);
        }
    }

    function updateBarHeight(): void {
        if (viewport.height !== 0 && contentHeight !== 0) {
            setBarHeight(
                Math.ceil(viewport.height * (viewport.height / contentHeight)),
            );
        } else {
            setBarHeight(0);
        }
    }

    function onMouse(event: MouseEvent): void {
        if (event.button === "wheel-up") {
            updateViewportOffset(viewportOffset - 4);
        } else if (event.button === "wheel-down") {
            updateViewportOffset(viewportOffset + 4);
        }
    }

    const viewportPercent = viewportOffset / maxViewportOffset;
    return (
        <Box ref={viewportRef} onMouse={onMouse} drawOverflow={false}>
            <Box {...props} drawOffsetTop={-viewportOffset} ref={contentRef}>
                {props.children}
            </Box>
            <Box
                width={1}
                textDirection="vertical"
                direction="column"
                marginTop={Math.ceil(
                    viewportPercent * (viewport.height - barHeight),
                )}
                grow={1}
            >
                {Array(barHeight)
                    .fill("┃")
                    .join("")}
            </Box>
        </Box>
    );
}
