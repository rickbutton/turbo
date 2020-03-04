import { Action, uuid, BreakpointId, Script } from "@turbo/core";

export function setBreakpoint(
    script: Script,
    line: number,
    column?: number,
): Action {
    return {
        type: "set-breakpoint-request",
        breakpoint: {
            id: uuid() as BreakpointId,
            line,
            column,
            url: script.url,
            rawUrl: script.rawUrl,
            raw: undefined,
        },
    };
}

export function removeBreakpoint(id: BreakpointId): Action {
    return { type: "remove-b-request", id };
}
