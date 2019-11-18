import { startDaemon } from "@jug/daemon";
import { Jug } from "@jug/core";

export function daemon(_: Jug): void {
    startDaemon();
}
