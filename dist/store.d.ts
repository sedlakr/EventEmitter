/** Anything usable as a handler context. */
export type Context = object;
/** A subscribed handler. Params are passed as a single argument, or none. */
export type Handler = (params?: unknown) => unknown;
/**
 * One subscription. `removed` is set before the record is spliced out so that
 * a dispatch already in flight - `evaluate` iterates a clone - skips handlers
 * that unsubscribed during that same dispatch.
 */
export declare class StoreRecord {
    context: Context;
    handler: Handler;
    removed: boolean;
    constructor(context: Context, handler: Handler);
}
type StoreData = Record<string, StoreRecord[]>;
/**
 * Store for emitter.
 */
export declare class Store {
    /** Lives on the prototype, not the instance. */
    version: string;
    store: StoreData;
    constructor();
    save(context: Context, name: string, handler: Handler): void;
    remove(context: Context, name?: string | null, handler?: Handler): void;
    evaluate(name: string, params?: unknown): void;
    request(name: string, params?: unknown): unknown;
    ctxRequest(ctx: Context, name: string, params?: unknown): unknown;
    demand(name: string, params?: unknown): unknown;
    watching(name: string): number;
    ctxWatching(ctx: Context, name: string): number;
}
export {};
