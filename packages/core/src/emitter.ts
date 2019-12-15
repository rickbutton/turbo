type EmitterCallback<T> = (event: T) => void;
type EmitterMap<T> = { [K in keyof T]: Set<EmitterCallback<T[K]>> };

export interface Emitter<T> {
    on<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void;
    once<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void;
    off<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void;
    clear<N extends keyof T>(name: N): void;
    fire<N extends keyof T>(name: N, event: T[N]): void;
}

export abstract class EmitterBase<T> implements Emitter<T> {
    private map: EmitterMap<T> = {} as EmitterMap<T>;
    private mapOnce: EmitterMap<T> = {} as EmitterMap<T>;

    once<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void {
        if (this.mapOnce[name]) {
            this.mapOnce[name].add(func);
        } else {
            this.mapOnce[name] = new Set([func]);
        }
    }
    on<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void {
        if (this.map[name]) {
            this.map[name].add(func);
        } else {
            this.map[name] = new Set([func]);
        }
    }
    off<N extends keyof T>(name: N, func: EmitterCallback<T[N]>): void {
        if (this.map[name]) {
            this.map[name].delete(func);

            if (this.map[name].size === 0) {
                delete this.map[name];
            }
        }
        if (this.mapOnce[name]) {
            this.mapOnce[name].delete(func);

            if (this.mapOnce[name].size === 0) {
                delete this.mapOnce[name];
            }
        }
    }
    clear<N extends keyof T>(name: N): void {
        delete this.map[name];
    }
    fire<N extends keyof T>(name: N, event: T[N]): void {
        if (this.map[name]) {
            for (const func of this.map[name]) {
                func(event);
            }
        }
        if (this.mapOnce[name]) {
            for (const func of this.mapOnce[name]) {
                func(event);
            }
            delete this.mapOnce[name];
        }
    }
}
