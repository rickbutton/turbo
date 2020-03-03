import { Node, Container, findClosestParent, resolveProperty } from "./dom";
import * as yoga from "yoga-layout-prebuilt";
import { Span } from "./ansi";
import { DrawAttribute } from "./buffertarget";

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

function normalizeSpanColor(
    color: string | number | undefined,
    bgColor: string | number | undefined,
    span: Span,
): DrawAttribute {
    const normalColor = typeof color !== "undefined" ? color : span.color;
    const normalBgColor =
        typeof bgColor !== "undefined" ? bgColor : span.bgColor;
    return {
        color: normalColor,
        defaultColor: typeof normalColor === "undefined",
        bgColor: normalBgColor,
        bgDefaultColor: typeof normalBgColor === "undefined",
        bold: span.bold,
        dim: span.dim,
        italic: span.italic,
        underline: span.underline,
        blink: span.blink,
        inverse: span.inverse,
        strike: span.strike,
    };
}

class DrawContext {
    private funcs: Set<() => void> = new Set();
    public add(func: () => void): void {
        this.funcs.add(func);
    }
    public complete(): void {
        for (const func of this.funcs) {
            func();
        }
    }
}

function drawNode(
    node: Node,
    offsetX: number,
    offsetY: number,
    container: Container,
    context: DrawContext,
): void {
    const { target } = container;
    const x = offsetX + node.yoga.getComputedLeft();
    const y = offsetY + node.yoga.getComputedTop();

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

    if (node.type === "text" && node.parent) {
        const color = resolveProperty(node, n => n.color);
        const bg = resolveProperty(node, n => n.bg);

        for (const part of node.parts) {
            const partX = x + part.yoga.getComputedLeft();
            const partY = y + part.yoga.getComputedTop();
            target.draw(
                partX + drawOffsetLeft,
                partY + drawOffsetTop,
                xmin,
                xmax,
                ymin,
                ymax,
                normalizeSpanColor(color, bg, part.span),
                part.span.value,
            );
        }
    } else if (node.type !== "text") {
        if (node.attributes["unstable_moveCursorToThisPosition"]) {
            const cursorX = x + drawOffsetLeft;
            const cursorY = y + drawOffsetTop;
            if (
                cursorX >= xmin &&
                cursorX <= xmax &&
                cursorY >= ymin &&
                cursorY <= ymax
            ) {
                target.setCursor(cursorX, cursorY);
            } else {
                target.clearCursor();
            }
        }
        if (node.unstable_onNodeDrawn) {
            context.add(node.unstable_onNodeDrawn);
        }

        if (node.bg !== undefined) {
            target.fillBg(
                x + drawOffsetLeft,
                x + drawOffsetLeft + node.yoga.getComputedWidth() - 1,
                y + drawOffsetTop,
                y + drawOffsetTop + node.yoga.getComputedHeight() - 1,
                node.bg,
            );
        }

        for (const child of node.children) {
            drawNode(child, x, y, container, context);
        }
    }
}

export function drawContainer(container: Container): void {
    const context = new DrawContext();
    const { node, target } = container;
    const { width, height } = target;
    if (container.drawing) {
        throw new Error("container still drawing");
    }
    container.drawing = true;

    let delta = true;
    if (container.forceRedraw) {
        container.forceRedraw = false;
        delta = false;
    }

    node.yoga.setWidth(width);
    if (typeof height !== "undefined") {
        node.yoga.setHeight(height);
    } else {
        node.yoga.setHeightAuto();
    }

    for (const child of node.children) {
        child.yoga.setWidth(width);
        if (typeof height !== "undefined") {
            child.yoga.setHeight(height);
        } else {
            child.yoga.setHeightAuto();
        }
    }

    const direction = yoga.DIRECTION_LTR;
    node.yoga.calculateLayout(width, height, direction);

    const x = node.yoga.getComputedLeft();
    const y = node.yoga.getComputedTop();

    const realWidth = node.yoga.getComputedWidth();
    const realHeight = node.yoga.getComputedHeight();
    target.prepare(realWidth, realHeight);
    drawNode(node, x, y, container, context);

    target.flush(delta);

    container.drawing = false;
    context.complete();
}

const scheduleMap = new Map<Container, NodeJS.Immediate>();
export function scheduleDraw(container: Container): void {
    if (!scheduleMap.has(container)) {
        scheduleMap.set(
            container,
            setImmediate(() => {
                scheduleMap.delete(container);
                drawContainer(container);
            }),
        );
    }
}
