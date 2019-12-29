import * as yoga from "yoga-layout-prebuilt";
import { applyStyle } from "./style";
import stringWidth from "string-width";
import { BufferTarget } from "./buffertarget";

export interface Container {
    target: BufferTarget;
    node: ComplexNode;
    forceRedraw: boolean;
}

interface MouseEvent {
    x: number;
    y: number;
}

type Attributes = { [key: string]: any };
export interface ComplexNode {
    type: "complex";
    name: string;
    yoga: yoga.YogaNode;
    wrap: boolean;
    children: Node[];
    parent: ComplexNode | null;
    attributes: Attributes;

    onClick?(event: MouseEvent): void;
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
    return {
        type: "complex",
        name: name.toLowerCase(),
        yoga: yoga.Node.create(),
        children: [],
        parent: null,
        attributes: {},
        wrap: false,
    };
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

export function updateTextNodeLayout(node: TextNode): void {
    const childrenToRemove: yoga.YogaNode[] = [];
    for (let i = 0; i < node.yoga.getChildCount(); i++) {
        childrenToRemove.push(node.yoga.getChild(i));
    }
    for (const child of childrenToRemove) {
        node.yoga.removeChild(child);
    }
    node.parts = [];

    const wrap = resolveProperty(node, n => n.wrap) || false;
    const words = wrap ? splitOnWordStart(node.value) : noSplit(node.value);
    for (const word of words) {
        const part: TextNodePart = {
            value: word,
            yoga: yoga.Node.create(),
        };
        const width = stringWidth(word);
        part.yoga.setWidth(width);
        part.yoga.setHeight(1);

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
    node.yoga.setFlexDirection(yoga.FLEX_DIRECTION_ROW);
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
}

export function appendChildNode(node: ComplexNode, child: Node): void {
    if (child.parent) {
        removeChildNode(child.parent, child);
        child.parent.yoga.removeChild(child.yoga);
    }
    child.parent = node;

    node.children.push(child);
    node.yoga.insertChild(child.yoga, node.yoga.getChildCount());
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
}

export function applyAttributes(
    node: ComplexNode,
    attributes: Attributes,
): void {
    const attrs: Attributes = {};

    for (const [key, value] of Object.entries(attributes)) {
        if (key === "style") {
            applyStyle(node.yoga, value);
        } else if (key === "wrap") {
            node.wrap = Boolean(value);
        } else if (key === "onClick") {
            node.onClick = value;
        } else {
            attrs[key] = value;
        }
    }
    node.attributes = attrs;
}

export function getMostSpecificNodeContainingPosition(
    node: ComplexNode,
    x: number,
    y: number,
    offsetX = 0,
    offsetY = 0,
): ComplexNode | null {
    const nodeX = offsetX + node.yoga.getComputedLeft();
    const nodeY = offsetY + node.yoga.getComputedTop();
    const width = node.yoga.getComputedWidth();
    const height = node.yoga.getComputedHeight();

    const xmin = nodeX;
    const xmax = nodeX + width;
    const ymin = nodeY;
    const ymax = nodeY + height;

    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
        if (!node.children.every(c => c.type === "text")) {
            for (const child of node.children) {
                if (child.type == "complex") {
                    const childMostSpecific = getMostSpecificNodeContainingPosition(
                        child,
                        x,
                        y,
                        nodeX,
                        nodeY,
                    );
                    if (childMostSpecific) {
                        return childMostSpecific;
                    }
                }
            }
        }
        return node;
    } else {
        return null;
    }
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
        for (const part of node.parts) {
            const partX = x + part.yoga.getComputedLeft();
            const partY = y + part.yoga.getComputedTop();
            const partWidth = part.yoga.getComputedWidth();
            target.put(partX, partY, part.value.substring(0, partWidth));
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
