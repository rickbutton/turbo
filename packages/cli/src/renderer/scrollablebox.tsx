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

interface ScrollableBoxProps extends BoxProps {
    snapToBottom?: boolean;
}
export function ScrollableBox(props: ScrollableBoxProps): JSX.Element {
    const contentRef = React.useRef<any>();
    const viewportRef = React.useRef<any>();
    const viewport = useSize(viewportRef);
    const shouldSnapToBottom = props.snapToBottom || false;

    const [contentHeight, setContentHeight] = React.useState(0);
    const [viewportOffset, setViewportOffset] = React.useState(0);
    const [snappedToBottom, setSnappedToBottom] = React.useState(
        props.snapToBottom,
    );
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
        updateViewportOffset(viewportOffset, false);
        updateBarHeight();
    }, [viewport.height, contentHeight]);

    function updateViewportOffset(
        offset: number,
        userInteraction: boolean,
    ): void {
        let newOffset = 0;
        if (snappedToBottom && !userInteraction) {
            newOffset = maxViewportOffset;
        } else if (offset < minViewportOffset) {
            newOffset = minViewportOffset;
        } else if (offset > maxViewportOffset) {
            newOffset = maxViewportOffset;
        } else {
            newOffset = offset;
        }

        if (shouldSnapToBottom && newOffset === maxViewportOffset) {
            // should snap, and reached bottom
            setSnappedToBottom(true);
            setViewportOffset(maxViewportOffset);
        }
        if (userInteraction && newOffset !== viewportOffset) {
            // user moved viewport, should snap
            setSnappedToBottom(false);
        }
        setViewportOffset(newOffset);
    }

    function updateBarHeight(): void {
        if (
            viewport.height !== 0 &&
            contentHeight !== 0 &&
            viewport.height < contentHeight
        ) {
            setBarHeight(
                Math.ceil(viewport.height * (viewport.height / contentHeight)),
            );
        } else {
            setBarHeight(0);
        }
    }

    function onMouse(event: MouseEvent): void {
        if (event.button === "wheel-up") {
            updateViewportOffset(viewportOffset - 4, true);
        } else if (event.button === "wheel-down") {
            updateViewportOffset(viewportOffset + 4, true);
        }
    }

    const viewportPercent = viewportOffset / maxViewportOffset;

    return (
        <Box ref={viewportRef} onMouse={onMouse} drawOverflow={false} grow={1}>
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
            >
                {Array(barHeight)
                    .fill("┃")
                    .join("")}
            </Box>
        </Box>
    );
}
