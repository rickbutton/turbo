import { Jug } from "@jug/core";

export function component(_: Jug, name: string): void {
    setInterval(() => {
        console.log(name);
    }, 2000);
    console.log(name);
}
