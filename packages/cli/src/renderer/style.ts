import * as yoga from "yoga-layout-prebuilt";

export interface NodeStyle {
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
    alignItems?: "stretch" | "flex-start" | "flex-end" | "center" | "baseline";
    justifyContent?:
        | "flex-start"
        | "flex-end"
        | "center"
        | "space-between"
        | "space-around"
        | "space-evenly";
    height?: number | string;
    width?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;
    minWidth?: number | string;
    maxWidth?: number | string;

    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
}

export function applyStyle(node: yoga.YogaNode, style: NodeStyle): void {
    if (typeof style.flexGrow !== "undefined") {
        node.setFlexGrow(style.flexGrow);
    }
    if (typeof style.flexShrink !== "undefined") {
        node.setFlexShrink(style.flexShrink);
    }
    if (typeof style.flexBasis !== "undefined") {
        node.setFlexBasis(style.flexBasis);
    }
    if (typeof style.flexDirection !== "undefined") {
        switch (style.flexDirection) {
            case "row":
                node.setFlexDirection(yoga.FLEX_DIRECTION_ROW);
                break;
            case "column":
                node.setFlexDirection(yoga.FLEX_DIRECTION_COLUMN);
                break;
            case "row-reverse":
                node.setFlexDirection(yoga.FLEX_DIRECTION_ROW_REVERSE);
                break;
            case "column-reverse":
                node.setFlexDirection(yoga.FLEX_DIRECTION_COLUMN_REVERSE);
                break;
            default:
                throw new Error();
        }
    }
    if (typeof style.alignItems !== "undefined") {
        switch (style.alignItems) {
            case "stretch":
                node.setAlignItems(yoga.ALIGN_STRETCH);
                break;
            case "flex-start":
                node.setAlignItems(yoga.ALIGN_FLEX_START);
                break;
            case "flex-end":
                node.setAlignItems(yoga.ALIGN_FLEX_END);
                break;
            case "center":
                node.setAlignItems(yoga.ALIGN_CENTER);
                break;
            case "baseline":
                node.setAlignItems(yoga.ALIGN_BASELINE);
                break;
        }
    }
    if (typeof style.justifyContent !== "undefined") {
        switch (style.justifyContent) {
            case "flex-start":
                node.setJustifyContent(yoga.JUSTIFY_FLEX_START);
                break;
            case "flex-end":
                node.setJustifyContent(yoga.JUSTIFY_FLEX_END);
                break;
            case "center":
                node.setJustifyContent(yoga.JUSTIFY_CENTER);
                break;
            case "space-between":
                node.setJustifyContent(yoga.JUSTIFY_SPACE_BETWEEN);
                break;
            case "space-around":
                node.setJustifyContent(yoga.JUSTIFY_SPACE_AROUND);
                break;
            case "space-evenly":
                node.setJustifyContent(yoga.JUSTIFY_SPACE_EVENLY);
                break;
        }
    }

    if (typeof style.height !== "undefined") {
        node.setHeight(style.height);
    } else {
        node.setHeightAuto();
    }
    if (typeof style.width !== "undefined") {
        node.setWidth(style.width);
    } else {
        node.setWidthAuto();
    }

    if (typeof style.minWidth !== "undefined") {
        node.setMinWidth(style.minWidth);
    } else {
        node.setMinWidth(0);
    }
    if (typeof style.maxWidth !== "undefined") {
        node.setMaxWidth(style.maxWidth);
    } else {
        node.setMaxWidth(Number.MAX_SAFE_INTEGER);
    }

    if (typeof style.minHeight !== "undefined") {
        node.setMinHeight(style.minHeight);
    } else {
        node.setMinHeight(0);
    }
    if (typeof style.maxHeight !== "undefined") {
        node.setMaxHeight(style.maxHeight);
    } else {
        node.setMaxHeight(Number.MAX_SAFE_INTEGER);
    }

    if (typeof style.marginTop !== "undefined") {
        node.setMargin(yoga.EDGE_TOP, style.marginTop);
    } else {
        node.setMargin(yoga.EDGE_TOP, 0);
    }
    if (typeof style.marginBottom !== "undefined") {
        node.setMargin(yoga.EDGE_BOTTOM, style.marginBottom);
    } else {
        node.setMargin(yoga.EDGE_BOTTOM, 0);
    }
    if (typeof style.marginLeft !== "undefined") {
        node.setMargin(yoga.EDGE_LEFT, style.marginLeft);
    } else {
        node.setMargin(yoga.EDGE_LEFT, 0);
    }
    if (typeof style.marginRight !== "undefined") {
        node.setMargin(yoga.EDGE_RIGHT, style.marginRight);
    } else {
        node.setMargin(yoga.EDGE_RIGHT, 0);
    }

    if (typeof style.paddingTop !== "undefined") {
        node.setPadding(yoga.EDGE_TOP, style.paddingTop);
    } else {
        node.setPadding(yoga.EDGE_TOP, 0);
    }
    if (typeof style.paddingBottom !== "undefined") {
        node.setPadding(yoga.EDGE_BOTTOM, style.paddingBottom);
    } else {
        node.setPadding(yoga.EDGE_BOTTOM, 0);
    }
    if (typeof style.paddingLeft !== "undefined") {
        node.setPadding(yoga.EDGE_LEFT, style.paddingLeft);
    } else {
        node.setPadding(yoga.EDGE_LEFT, 0);
    }
    if (typeof style.paddingRight !== "undefined") {
        node.setPadding(yoga.EDGE_RIGHT, style.paddingRight);
    } else {
        node.setPadding(yoga.EDGE_RIGHT, 0);
    }
}
