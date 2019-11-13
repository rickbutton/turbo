export function component(name: string): void {
    setInterval(() => {
        console.log(name);
    }, 2000);
    console.log(name);
}
