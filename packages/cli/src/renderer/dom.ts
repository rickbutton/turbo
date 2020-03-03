import * as yoga from "yoga-layout-prebuilt";
import { applyStyle } from "./style";
import stringWidth from "string-width";
import { BufferTarget, MouseEvent } from "./buffertarget";
import { Span, parseAnsi } from "./ansi";
import { logger } from "@turbo/core";

export interface Container {
    drawing: boolean;
    target: BufferTarget;
    node: ComplexNode;
    forceRedraw: boolean;
}

type Attributes = { [key: string]: any };
export interface ComplexNode {
    type: "complex";
    name: string;
    yoga: yoga.YogaNode;
    children: Node[];
    parent: ComplexNode | null;
    attributes: Attributes;

    color?: string | number;
    bg?: string | number;
    drawOffsetTop?: number;
    drawOffsetLeft?: number;
    drawOverflow: boolean;
    wrap: boolean;

    onClick?(event: MouseEvent): void;
    onMouse?(event: MouseEvent): void;

    // eslint-disable-next-line @typescript-eslint/camelcase
    unstable_onNodeDrawn?(): void;
}

interface TextSize {
    width: number;
    height: number;
}

export interface TextNodePart {
    span: Span;
    width: number;
    yoga: yoga.YogaNode;
}
export interface TextNode {
    type: "text";
    yoga: yoga.YogaNode;
    value: string;
    parts: TextNodePart[];
    parent: ComplexNode | null;
}
export type Node = ComplexNode | TextNode;

export function findClosestParent<M extends (n: ComplexNode) => boolean>(
    node: Node,
    matcher: M,
): ComplexNode | undefined {
    if (node.parent) {
        if (matcher(node.parent)) {
            return node.parent;
        } else {
            return findClosestParent(node.parent, matcher);
        }
    } else {
        return undefined;
    }
}

export function resolveProperty<G extends (n: ComplexNode) => any>(
    node: Node,
    getter: G,
): ReturnType<G> | undefined {
    if (node.parent) {
        const parentValue = getter(node.parent);
        if (typeof parentValue !== "undefined") {
            return parentValue;
        } else {
            return resolveProperty(node.parent, getter);
        }
    } else {
        return undefined;
    }
}

export function forAllComplexChildren(
    node: ComplexNode,
    cb: (node: ComplexNode, x: number, y: number) => void,
    x = 0,
    y = 0,
): void {
    let drawOffsetTop = 0,
        drawOffsetLeft = 0;
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

    const nodeX = x + node.yoga.getComputedLeft();
    const nodeY = y + node.yoga.getComputedTop();

    cb(node, nodeX + drawOffsetLeft, nodeY + drawOffsetTop);
    for (const child of node.children) {
        if (child.type === "complex") {
            forAllComplexChildren(child, cb, nodeX, nodeY);
        }
    }
}

export function forAllTextChildren(
    node: ComplexNode,
    cb: (node: TextNode) => void,
): void {
    for (const child of node.children) {
        if (child.type === "text") {
            cb(child);
        } else {
            forAllTextChildren(child, cb);
        }
    }
}

export function createNode(name: string): ComplexNode {
    const node: ComplexNode = {
        type: "complex",
        name: name.toLowerCase(),
        yoga: yoga.Node.create(),
        children: [],
        parent: null,
        attributes: {},
        wrap: false,
        drawOverflow: true,
    };
    return node;
}

export function createContainer(target: BufferTarget): Container {
    return {
        drawing: false,
        node: createNode("#root"),
        target,
        forceRedraw: false,
    };
}

export function calculateTextHeight(node: Node, width: number): number {
    if (node.type === "text") {
        let bottom = node.yoga.getComputedTop() + node.yoga.getComputedHeight();
        for (const part of node.parts) {
            const partBottom =
                part.yoga.getComputedBottom() + part.yoga.getComputedHeight();
            if (partBottom > bottom) {
                bottom = partBottom;
            }
        }
        return bottom;
    } else {
        let bottom = node.yoga.getComputedTop() + node.yoga.getComputedHeight();
        for (const child of node.children) {
            let childBottom =
                child.yoga.getComputedTop() + child.yoga.getComputedHeight();
            if (childBottom > bottom) {
                bottom = childBottom;
            }

            childBottom = calculateTextHeight(child, width);
            if (childBottom > bottom) {
                bottom = childBottom;
            }
        }
        return bottom;
    }
}

export function updateTextNodeLayout(node: TextNode): void {
    if (!node.parent) return;

    const childrenToRemove: yoga.YogaNode[] = [];
    for (let i = 0; i < node.yoga.getChildCount(); i++) {
        childrenToRemove.push(node.yoga.getChild(i));
    }
    for (const child of childrenToRemove) {
        node.yoga.removeChild(child);
        child.free();
    }
    node.parts = [];

    const wrap = node.parent.wrap;
    node.yoga.setFlexWrap(wrap ? yoga.WRAP_WRAP : yoga.WRAP_NO_WRAP);

    const spans = parseAnsi(node.value, wrap);
    for (const span of spans) {
        const part = createTextNodePart(span);
        node.parts.push(part);
        node.yoga.insertChild(part.yoga, node.yoga.getChildCount());
    }
}

function createTextNodePart(span: Span): TextNodePart {
    const width = stringWidth(span.value);
    const part = {
        span,
        width,
        yoga: yoga.Node.create(),
    };
    part.yoga.setWidth(width);
    part.yoga.setMinWidth(width);
    part.yoga.setHeight(1);
    part.yoga.setMinHeight(1);

    return part;
}

export function createTextNode(text: string): TextNode {
    const node: TextNode = {
        type: "text",
        parent: null,
        parts: [],
        value: text,
        yoga: yoga.Node.create(),
    };
    node.yoga.setFlexWrap(yoga.WRAP_WRAP);
    node.yoga.setFlexDirection(yoga.FLEX_DIRECTION_ROW);
    return node;
}

export function removeChildNode(node: ComplexNode, child: Node): void {
    child.parent = null;
    const index = node.children.indexOf(child);
    if (index >= 0) {
        node.children.splice(index, 1);
        const yoga = node.yoga.getChild(index);
        node.yoga.removeChild(yoga);
    }
}

export function appendChildNode(node: ComplexNode, child: Node): void {
    if (child.parent) {
        removeChildNode(child.parent, child);
        child.parent.yoga.removeChild(child.yoga);
    }
    child.parent = node;

    node.children.push(child);
    node.yoga.insertChild(child.yoga, node.yoga.getChildCount());

    if (child.type === "text") {
        updateTextNodeLayout(child);
    }
}

export function insertBeforeNode(
    node: ComplexNode,
    child: Node,
    before: Node,
): void {
    if (child.parent) {
        removeChildNode(child.parent, child);
        child.parent.yoga.removeChild(child.yoga);
    }
    child.parent = node;

    const index = node.children.indexOf(before);
    if (index >= 0) {
        node.children.splice(index, 0, child);
        node.yoga.insertChild(child.yoga, index);
    } else {
        node.children.push(child);
        node.yoga.insertChild(child.yoga, node.yoga.getChildCount());
    }

    if (child.type === "text") {
        updateTextNodeLayout(child);
    }
}

export function applyAttributes(
    node: ComplexNode,
    attributes: Attributes,
): void {
    node.attributes = { ...attributes };

    if (node.attributes.style) {
        applyStyle(node.yoga, node.attributes.style);
    } else {
        applyStyle(node.yoga, {});
    }
    node.drawOffsetTop = node.attributes.drawOffsetTop;
    node.drawOffsetLeft = node.attributes.drawOffsetLeft;
    node.drawOverflow =
        typeof node.attributes.drawOverflow !== "undefined"
            ? node.attributes.drawOverflow
            : true;
    node.color = node.attributes.color;
    node.bg = node.attributes.bg;
    node.onClick = node.attributes.onClick;
    node.onMouse = node.attributes.onMouse;

    const wrap = Boolean(node.attributes.wrap);
    if (node.wrap !== wrap) {
        node.wrap = wrap;
        for (const child of node.children) {
            if (child.type === "text") {
                updateTextNodeLayout(child);
            }
        }
    }
}

export function getNodesContainingPosition(
    node: ComplexNode,
    positionX: number,
    positionY: number,
): ComplexNode[] {
    const nodes: ComplexNode[] = [];
    forAllComplexChildren(node, (n, x, y) => {
        const width = n.yoga.getComputedWidth();
        const height = n.yoga.getComputedHeight();
        const xmin = x;
        const xmax = x + width - 1;
        const ymin = y;
        const ymax = y + height - 1;

        if (
            positionX >= xmin &&
            positionX <= xmax &&
            positionY >= ymin &&
            positionY <= ymax
        ) {
            nodes.push(n);
        }
    });
    return nodes;
}
