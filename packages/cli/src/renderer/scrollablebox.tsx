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

    React.useEffect(() => {
        if (contentRef.current && viewport.width !== 0) {
            const height = unstable_calculateTextHeight(
                contentRef.current,
                viewport.width,
            );
            setContentHeight(height);
        }
    }, [props.children, contentRef.current, viewport.width]);

    React.useEffect(() => {
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
            setViewportOffset(maxViewportOffset);
            setSnappedToBottom(true);
        } else {
            const shouldUnsnap =
                userInteraction && newOffset !== viewportOffset;
            setSnappedToBottom(shouldUnsnap);
            setViewportOffset(newOffset);
        }
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
        <Box
            grow={props.grow}
            shrink={props.shrink}
            basis={props.basis}
            height={props.height}
            width={props.width}
            minHeight={props.height}
            maxHeight={props.height}
            minWidth={props.width}
            maxWidth={props.width}
            marginTop={props.marginTop}
            marginBottom={props.marginBottom}
            marginLeft={props.marginLeft}
            marginRight={props.marginRight}
            drawOffsetTop={props.drawOffsetTop}
            drawOffsetLeft={props.drawOffsetLeft}
            drawOverflow={false} // hard coded
            ref={viewportRef}
            onClick={props.onClick}
            onMouse={onMouse}
        >
            <Box
                grow={1}
                direction={props.direction}
                alignItems={props.alignItems}
                justify={props.justify}
                color={props.color}
                bg={props.bg}
                wrap={props.wrap}
                drawOffsetTop={-viewportOffset}
                ref={contentRef}
            >
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
