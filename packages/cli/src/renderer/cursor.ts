import React from "react";

export function Cursor(): JSX.Element {
    return React.createElement("div", {
        // eslint-disable-next-line @typescript-eslint/camelcase
        unstable_moveCursorToThisPosition: true,
    });
}
