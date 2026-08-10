/**
 * Entry point that does not define the `MQ` / `EventEmitter` globals.
 *
 * It does still use the `Symbol.for` registry in `./shared.js`, because that is
 * the only way duplicate copies of the package can find each other and share a
 * single event bus. Nothing readable by application code is added to
 * `globalThis`; import `@sedlak.r/mq` instead if you want the two globals.
 */
import { Emitter as LocalEmitter } from "./emitter.js";
import { Store as LocalStore, StoreRecord as LocalStoreRecord } from "./store.js";
import { Timer as LocalTimer } from "./timer.js";
import { getMqDefault as localGetMqDefault, setMqDefault as localSetMqDefault } from "./context.js";
export type { DecoratedHandler } from "./emitter.js";
export type { Context, Handler } from "./store.js";
export type Emitter = LocalEmitter;
export type Store = LocalStore;
export type StoreRecord = LocalStoreRecord;
export type Timer = LocalTimer;
/**
 * These resolve to whichever copy of the package loaded first, so two copies in
 * one bundle still dispatch to each other. When this copy is the only one - the
 * normal case - they are exactly its own.
 */
export declare const Emitter: typeof LocalEmitter;
export declare const Store: typeof LocalStore;
export declare const StoreRecord: typeof LocalStoreRecord;
export declare const Timer: typeof LocalTimer;
/** The shared, context-less emitter. Cannot be rebound with `in()`. */
export declare const EventEmitter: LocalEmitter;
export declare const getMqDefault: typeof localGetMqDefault;
export declare const setMqDefault: typeof localSetMqDefault;
