import {
    Node,
    Container,
    findClosestParent,
    forAllTextChildren,
    updateTextNodeLayout,
    resolveProperty,
} from "./dom";
import * as yoga from "yoga-layout-prebuilt";

interface AbsoluteLayout {
    top: number;
    left: number;
    width: number;
    height: number;
}
function getAbsoluteLayout(node: Node): AbsoluteLayout {
    let top = 0,
        left = 0;

    let n: Node | null = node;
    while (n !== null) {
        top += n.yoga.getComputedTop();
        left += n.yoga.getComputedLeft();
        n = n.parent;
    }

    const width = node.yoga.getComputedWidth();
    const height = node.yoga.getComputedHeight();
    return { top, left, width, height };
}

function drawNode(
    node: Node,
    offsetX: number,
    offsetY: number,
    container: Container,
): void {
    const { target } = container;
    const x = offsetX + node.yoga.getComputedLeft();
    const y = offsetY + node.yoga.getComputedTop();

    if (node.type === "text" && node.parent) {
        let xmin = 0,
            xmax = 0,
            ymin = 0,
            ymax = 0,
            drawOffsetTop = 0,
            drawOffsetLeft = 0;

        const boundingParent = findClosestParent(
            node,
            n => n.drawOverflow === false,
        );
        if (!boundingParent) {
            xmin = x;
            xmax = x + node.yoga.getComputedWidth() - 1;
            ymin = y;
            ymax = y + node.yoga.getComputedHeight() - 1;
        } else {
            const boundingLayout = getAbsoluteLayout(boundingParent);
            xmin = boundingLayout.left;
            xmax = boundingLayout.left + boundingLayout.width - 1;
            ymin = boundingLayout.top;
            ymax = boundingLayout.top + boundingLayout.height - 1;
        }

        const drawOffsetTopParent = findClosestParent(
            node,
            n => n.drawOffsetTop !== undefined,
        );
        if (drawOffsetTopParent) {
            drawOffsetTop = drawOffsetTopParent.drawOffsetTop || 0;
        }
        const drawOffsetLeftParent = findClosestParent(
            node,
            n => n.drawOffsetLeft !== undefined,
        );
        if (drawOffsetLeftParent) {
            drawOffsetLeft = drawOffsetLeftParent.drawOffsetLeft || 0;
        }

        const color = resolveProperty(node, n => n.color);
        const bg = resolveProperty(node, n => n.bg);

        for (const part of node.parts) {
            const vertical = part.direction === "vertical";
            const partX = x + part.yoga.getComputedLeft();
            const partY = y + part.yoga.getComputedTop();
            const partWidth = vertical
                ? part.yoga.getComputedHeight()
                : part.yoga.getComputedWidth();

            target.draw(
                partX + drawOffsetLeft,
                partY + drawOffsetTop,
                xmin,
                xmax,
                ymin,
                ymax,
                color,
                bg,
                vertical,
                part.value.substring(0, partWidth),
            );
        }
    } else if (node.type !== "text") {
        if (node.attributes["unstable_moveCursorToThisPosition"]) {
            target.setCursor(x, y);
        }

        for (const child of node.children) {
            drawNode(child, x, y, container);
        }
    }
}

export function drawContainer(container: Container): void {
    const { node, target } = container;
    const { width, height } = target;

    let delta = true;
    if (container.forceRedraw) {
        container.forceRedraw = false;
        delta = false;
    }

    forAllTextChildren(node, updateTextNodeLayout);

    target.clear();

    node.yoga.setWidth(width);
    node.yoga.setHeight(height);

    const direction = yoga.DIRECTION_LTR;
    node.yoga.calculateLayout(width, height, direction);

    const x = node.yoga.getComputedLeft();
    const y = node.yoga.getComputedTop();
    drawNode(node, x, y, container);

    target.flush(delta);
}
