import { Turbo } from "@turbo/core";

export function ls(turbo: Turbo): void {
    const ids = turbo.env.getAllSessionIds();

    if (ids.length > 0) {
        console.log(
            ids.length === 1
                ? "there is one running turbo session:\n"
                : `there are ${ids.length} running turbo sessions:\n`,
        );
        for (const id of ids) {
            console.log(id);
        }
    } else {
        console.log("there are no running turbo sessions");
    }
}
