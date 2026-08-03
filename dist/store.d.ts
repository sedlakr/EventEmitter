/**
 * Anything usable as a handler context.
 *
 * Contexts are only ever compared by identity, so a primitive works as well as
 * an object and callers do pass strings. `object` would reject those; this is
 * the modern spelling of the `Object` the previous declaration used.
 */
export type Context = NonNullable<unknown>;
/**
 * A subscribed handler. Params are passed as a single argument, or none.
 *
 * The parameter is `any` rather than `unknown` on purpose. An event bus cannot
 * know what a given event carries, and every consumer reaches straight into the
 * payload (`data => use(data[0])`). Typing it `unknown` forces a cast at every
 * subscribe callback for no safety that the caller did not already have.
 * Narrow it per event with the generic on `subscribe` instead.
 */
export type Handler<T = any> = (params?: T) => unknown;
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
    request<T = unknown>(name: string, params?: unknown): T;
    ctxRequest<T = unknown>(ctx: Context, name: string, params?: unknown): T;
    demand<T = unknown>(name: string, params?: unknown): T;
    watching(name: string): number;
    ctxWatching(ctx: Context, name: string): number;
}
export {};
