/**
 * Default entry point - a backward-compatible superset of the old bundle.
 *
 * It installs `globalThis.MQ` and `globalThis.EventEmitter` exactly as the
 * concatenated build did, because `main` has always pointed at that bundle and
 * existing consumers depend on the globals. On top of that it re-exports
 * everything as named exports, so new code can import instead.
 *
 * Import `@sedlak.r/mq/pure` for the same API without the globals.
 */
import { Emitter } from "./emitter.js";
import { Store } from "./store.js";
import { Timer } from "./timer.js";
export * from "./pure.js";
/** The shape published as `globalThis.MQ`. */
export interface MQNamespace {
    Emitter: typeof Emitter;
    Store: typeof Store;
    Timer: typeof Timer;
    /**
     * The sentinel context. Writable, and kept in sync with the module-level
     * binding the store and emitter actually compare against.
     */
    mqDefault: object;
}
type EmitterInstance = Emitter;
type StoreInstance = Store;
type TimerInstance = Timer;
declare global {
    var MQ: MQNamespace;
    var EventEmitter: EmitterInstance;
    /**
     * `EventEmitter` is usable in type position as well as value position -
     * `private emitter: EventEmitter` is the common annotation in consuming
     * code. Declared alongside the `var` above, which occupies the value
     * namespace only.
     */
    type EventEmitter = EmitterInstance;
    /**
     * Instance types under the `MQ` name, so `foo: MQ.Emitter` resolves.
     * A types-only namespace emits no value, so it merges with the `var`.
     */
    namespace MQ {
        type Emitter = EmitterInstance;
        type Store = StoreInstance;
        type Timer = TimerInstance;
    }
}
