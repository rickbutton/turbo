import * as yoga from "yoga-layout-prebuilt";
import { applyStyle } from "./style";
import stringWidth from "string-width";
import { BufferTarget, MouseEvent } from "./buffertarget";

export interface Container {
    target: BufferTarget;
    node: ComplexNode;
    forceRedraw: boolean;
}

const DEFAULT_ORIENTATION = "horizontal";

type Attributes = { [key: string]: any };
export interface ComplexNode {
    type: "complex";
    name: string;
    yoga: yoga.YogaNode;
    children: Node[];
    parent: ComplexNode | null;
    attributes: Attributes;

    orientation: "horizontal" | "vertical";
    wrap: boolean;

    drawTop?: number;
    drawLeft?: number;
    onClick?(event: MouseEvent): void;
    onMouse?(event: MouseEvent): void;
}

interface TextSize {
    width: number;
    height: number;
}

export interface TextNodePart {
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

function resolveProperty<G extends (n: ComplexNode) => any>(
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

export function createNode(name: string): ComplexNode {
    const node: ComplexNode = {
        type: "complex",
        name: name.toLowerCase(),
        yoga: yoga.Node.create(),
        children: [],
        parent: null,
        attributes: {},
        orientation: DEFAULT_ORIENTATION,
        wrap: false,
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
    return [str.replace(/\r/g, "").replace(/\n/g, "")];
}

export function calculateTextHeight(node: Node, width: number): number {
    if (node.type === "complex") {
        // TODO: assert that flex direction is column
        let height = 0;
        for (const child of node.children) {
            height += calculateTextHeight(child, width);
        }

        return height;
    } else {
        const parent = createNode("div");
        applyAttributes(parent, {
            wrap: node.parent ? node.parent.wrap : false,
        });
        const text = createTextNode(node.value);
        text.yoga.setWidth(width);
        updateTextNodeLayout(text);
        appendChildNode(parent, text);

        parent.yoga.calculateLayout(width, Number.MAX_SAFE_INTEGER);

        const height = text.yoga.getComputedHeight();

        parent.yoga.free();
        text.yoga.free();

        return height;
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

    const orientation = node.parent.orientation;
    node.yoga.setFlexDirection(
        orientation === "horizontal"
            ? yoga.FLEX_DIRECTION_ROW
            : yoga.FLEX_DIRECTION_COLUMN,
    );

    const wrap = node.parent.wrap;
    const words = wrap ? splitOnWordStart(node.value) : noSplit(node.value);
    for (const word of words) {
        const part: TextNodePart = {
            value: word,
            yoga: yoga.Node.create(),
        };
        const width = stringWidth(word);

        if (orientation === "horizontal") {
            part.yoga.setWidth(width);
            part.yoga.setHeight(1);
        } else if (orientation === "vertical") {
            part.yoga.setWidth(1);
            part.yoga.setHeight(width);
        } else {
            throw new Error(`unknown orientation ${orientation}`);
        }

        node.parts.push(part);
        node.yoga.insertChild(part.yoga, node.yoga.getChildCount());
    }
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
    node.drawTop = node.attributes.drawTop;
    node.drawLeft = node.attributes.drawLeft;
    node.wrap = node.attributes.wrap;
    node.onClick = node.attributes.onClick;
    node.onMouse = node.attributes.onMouse;
    node.orientation = node.attributes.orientation || DEFAULT_ORIENTATION;
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
    const width = node.yoga.getComputedWidth();
    const height = node.yoga.getComputedHeight();

    if (node.type === "text" && node.parent) {
        const vertical = node.parent.orientation === "vertical";
        for (const part of node.parts) {
            const partX = x + part.yoga.getComputedLeft();
            const partY = y + part.yoga.getComputedTop();
            const partWidth = vertical
                ? part.yoga.getComputedHeight()
                : part.yoga.getComputedWidth();

            const drawTop = resolveProperty(node, n => n.drawTop) || 0;
            const drawLeft = resolveProperty(node, n => n.drawLeft) || 0;

            target.draw(
                vertical,
                partX + drawLeft,
                partY + drawTop,
                x,
                y,
                width,
                height,
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

    target.clear();
    forAllTextChildren(node, updateTextNodeLayout);

    node.yoga.setWidth(width);
    node.yoga.setHeight(height);

    const direction = yoga.DIRECTION_LTR;
    node.yoga.calculateLayout(width, height, direction);

    const x = node.yoga.getComputedLeft();
    const y = node.yoga.getComputedTop();
    drawNode(node, x, y, container);

    target.flush(delta);
}
