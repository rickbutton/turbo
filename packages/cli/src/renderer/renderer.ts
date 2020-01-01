import React from "react";
import Reconciler, { HostConfig } from "react-reconciler";
import {
    Node,
    TextNode,
    ComplexNode,
    createTextNode,
    createNode,
    appendChildNode,
    insertBeforeNode,
    removeChildNode,
    Container,
    createContainer,
    applyAttributes,
    getNodesContainingPosition,
} from "./dom";
import { drawContainer } from "./draw";
import { BufferTarget, BufferTargetContext } from "./buffertarget";
import { getTerminal } from "./terminal";

type ElementType = string;
type ElementProps = { [key: string]: any };
type HostContext = true;
const HostConfig: Reconciler.HostConfig<
    ElementType,
    ElementProps,
    Container,
    ComplexNode,
    TextNode,
    any,
    any,
    HostContext,
    any,
    any,
    any,
    any
> = {
    isPrimaryRenderer: true,
    now: Date.now,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    noTimeout: -1,
    scheduleDeferredCallback(
        callback: () => any,
        options?: { timeout: number },
    ): any {
        return setTimeout(callback, options ? options.timeout : 0);
    },
    cancelDeferredCallback(callbackID: any) {
        clearTimeout(callbackID);
    },
    supportsHydration: false,
    supportsPersistence: false,
    getPublicInstance(node: Node) {
        return node;
    },
    getRootHostContext(_container: Container): HostContext {
        return true;
    },
    getChildHostContext(
        _: HostContext,
        __: string,
        ___: Container,
    ): HostContext {
        return true;
    },
    shouldSetTextContent(_: string, __: ElementProps) {
        // TODO: don't create instance for text
        return false;
    },
    createTextInstance(
        text: string,
        _container: Container,
        _hostContext: HostContext,
    ) {
        return createTextNode(text);
    },
    createInstance(
        type: string,
        props: ElementProps,
        _container: Container,
        ___: HostContext,
    ) {
        const instance = createNode(type);
        applyAttributes(instance, props);
        return instance;
    },
    appendInitialChild: appendChildNode,
    finalizeInitialChildren(
        _parentInstance: ComplexNode,
        _type: string,
        _props: ElementProps,
        _rootContainerInstance: Container,
        _hostContext: HostContext,
    ): boolean {
        return false;
    },
    prepareForCommit(_: Container) {
        return undefined;
    },
    resetAfterCommit(container: Container) {
        drawContainer(container);
    },
    appendChildToContainer(container: Container, child: Node) {
        appendChildNode(container.node, child);
    },
    supportsMutation: true,
    commitMount(
        _instance: ComplexNode,
        _type: string,
        _newProps: ElementProps,
    ) {
        return undefined;
    },
    prepareUpdate(
        _instance: ComplexNode,
        _type: string,
        _oldProps: ElementProps,
        _newProps: ElementProps,
        rootContainerInstance: Container,
        _hostContext: HostContext,
    ) {
        return rootContainerInstance;
    },
    commitUpdate(
        instance: ComplexNode,
        updatePayload: any,
        _type: string,
        _oldProps: ElementProps,
        newProps: ElementProps,
    ) {
        applyAttributes(instance, newProps);
    },
    commitTextUpdate(instance: TextNode, _oldText: string, newText: string) {
        instance.value = newText;
    },
    appendChild: appendChildNode,
    insertBefore: insertBeforeNode,
    removeChild: removeChildNode,
    insertInContainerBefore(container: Container, child: Node, before: Node) {
        insertBeforeNode(container.node, child, before);
    },
    removeChildFromContainer(container: Container, child: Node) {
        removeChildNode(container.node, child);
    },
    resetTextContent(_: ComplexNode) {
        return undefined;
    },
    shouldDeprioritizeSubtree() {
        return false;
    },
};

const reconcilerInstance = Reconciler(HostConfig);

// eslint-disable-next-line @typescript-eslint/camelcase
export function unstable_batchedUpdates(cb: () => void): void {
    return reconcilerInstance.batchedUpdates(cb);
}

export function render(
    element: React.ReactElement<any>,
    target: BufferTarget = getTerminal(),
    callback?: () => void | null | undefined,
): void {
    const isAsync = false;
    const shouldHydrate = false;

    target.setup();
    const container = createContainer(target);
    const root = reconcilerInstance.createContainer(
        container,
        isAsync,
        shouldHydrate,
    );

    const parentComponent = null;

    const rootElement = React.createElement(
        BufferTargetContext.Provider,
        {
            value: target,
        },
        element,
    );

    function doRender(doCallback: boolean): void {
        reconcilerInstance.updateContainer(
            rootElement,
            root,
            parentComponent,
            doCallback && callback ? callback : (): void => undefined,
        );
    }

    target.on("resize", () => {
        container.forceRedraw = true;
        doRender(false);
    });
    target.on("mouse", event => {
        const { x, y } = event;
        const targets = getNodesContainingPosition(container.node, x, y);

        for (const target of targets) {
            if (event.button === "left" && !event.pressed && target.onClick) {
                target.onClick(event);
            }
            if (target.onMouse) {
                target.onMouse(event);
            }
        }
    });

    doRender(true);
}
