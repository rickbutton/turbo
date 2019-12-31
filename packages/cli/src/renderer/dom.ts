import * as yoga from "yoga-layout-prebuilt";
import { applyStyle, NodeStyle } from "./style";
import stringWidth from "string-width";
import { BufferTarget, MouseEvent } from "./buffertarget";

export interface Container {
    target: BufferTarget;
    node: ComplexNode;
    forceRedraw: boolean;
}

type TextDirection = "horizontal" | "vertical";
const DEFAULT_TEXT_DIRECTION: TextDirection = "horizontal";

type Attributes = { [key: string]: any };
export interface ComplexNode {
    type: "complex";
    name: string;
    yoga: yoga.YogaNode;
    children: Node[];
    parent: ComplexNode | null;
    attributes: Attributes;

    textDirection: TextDirection;
    drawOffsetTop?: number;
    drawOffsetLeft?: number;
    drawOverflow: boolean;
    wrap: boolean;

    onClick?(event: MouseEvent): void;
    onMouse?(event: MouseEvent): void;
}

interface TextSize {
    width: number;
    height: number;
}

export interface TextNodePart {
    direction: TextDirection;
    yoga: yoga.YogaNode;
    value: string;
}
export interface TextNode {
    type: "text";
    yoga: yoga.YogaNode;
    value: string;
    parts: TextNodePart[];
    parent: ComplexNode | null;
}
export type Node = ComplexNode | TextNode;

function findClosestParent<M extends (n: ComplexNode) => boolean>(
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

function forAllComplexChildren(
    node: ComplexNode,
    cb: (node: ComplexNode, x: number, y: number) => void,
    x = 0,
    y = 0,
): void {
    const nodeX = x + node.yoga.getComputedLeft();
    const nodeY = y + node.yoga.getComputedTop();

    cb(node, nodeX, nodeY);
    for (const child of node.children) {
        if (child.type === "complex") {
            forAllComplexChildren(child, cb, nodeX, nodeY);
        }
    }
}

function forAllTextChildren(
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

export function cloneNode(node: Node): Node {
    if (node.type === "text") {
        const newNode = createTextNode(node.value);
        updateTextNodeLayout(newNode);
        return newNode;
    } else {
        const newNode = createNode(node.name);
        applyAttributes(newNode, node.attributes);

        for (const child of node.children) {
            const newChild = cloneNode(child);
            appendChildNode(newNode, newChild);
        }
        return newNode;
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
        textDirection: DEFAULT_TEXT_DIRECTION,
        wrap: false,
        drawOverflow: true,
    };
    return node;
}

export function createContainer(target: BufferTarget): Container {
    return {
        node: createNode("#root"),
        target,
        forceRedraw: false,
    };
}

function splitOnWordStart(str: string): string[] {
    const parts: string[] = [];

    let part = "";
    let inWhitespace = false;

    for (const c of str) {
        if (c === "\r") continue;
        if (c === "\n") continue;

        if (inWhitespace) {
            if (/\s/.test(c)) {
                part += c;
            } else {
                parts.push(part);
                part = c;
                inWhitespace = false;
            }
        } else {
            if (/\s/.test(c)) {
                inWhitespace = true;
            }
            part += c;
        }
    }

    if (part) {
        parts.push(part);
    }
    return parts;
}

function noSplit(str: string): string[] {
    return [str];
}

export function calculateTextHeight(node: Node, width: number): number {
    const root = createNode("#root");
    const style: NodeStyle = {
        width,
    };
    applyAttributes(root, { style });

    const clone = cloneNode(node);
    appendChildNode(root, clone);

    forAllTextChildren(root, updateTextNodeLayout);

    root.yoga.calculateLayout(width, 1, yoga.DIRECTION_LTR);

    const height = clone.yoga.getComputedHeight();
    root.yoga.freeRecursive();
    return height;
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

    const textDirection = node.parent.textDirection;
    const wrap = node.parent.wrap;

    node.yoga.setFlexDirection(yoga.FLEX_DIRECTION_ROW);
    node.yoga.setFlexWrap(wrap ? yoga.WRAP_WRAP : yoga.WRAP_NO_WRAP);

    const words = wrap ? splitOnWordStart(node.value) : noSplit(node.value);
    for (const word of words) {
        const part = createTextNodePart(word, textDirection);
        node.parts.push(part);
        node.yoga.insertChild(part.yoga, node.yoga.getChildCount());
    }
}

function createTextNodePart(
    value: string,
    direction: TextDirection,
): TextNodePart {
    const part = {
        value,
        direction,
        yoga: yoga.Node.create(),
    };

    const width = stringWidth(value);
    if (direction === "horizontal") {
        part.yoga.setWidth(width);
        part.yoga.setHeight(1);
    } else if (direction === "vertical") {
        part.yoga.setWidth(1);
        part.yoga.setHeight(width);
    } else {
        throw new Error(`unknown direction ${direction}`);
    }

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

    if (child.type === "text") {
        updateTextNodeLayout(child);
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
    node.wrap = Boolean(node.attributes.wrap);
    node.onClick = node.attributes.onClick;
    node.onMouse = node.attributes.onMouse;
    node.textDirection =
        node.attributes.textDirection || DEFAULT_TEXT_DIRECTION;
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
        const xmax = x + width;
        const ymin = y;
        const ymax = y + height;

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
