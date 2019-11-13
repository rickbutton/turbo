export function startDaemon(): void {
    setInterval(() => {
        console.log("daemon");
    }, 2000);
}
