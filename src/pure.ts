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
import { adoptOrPublish } from "./shared.js";

export type { DecoratedHandler } from "./emitter.js";
export type { Context, Handler } from "./store.js";

// The values below are re-bound to whichever copy loaded first, which erases
// their class-as-type meaning. Re-declare the instance types so `x: Emitter`
// keeps working the way `export { Emitter }` used to allow.
export type Emitter = LocalEmitter;
export type Store = LocalStore;
export type StoreRecord = LocalStoreRecord;
export type Timer = LocalTimer;

const runtime = adoptOrPublish(__MQ_VERSION__, () => ({
	version: __MQ_VERSION__,
	Emitter: LocalEmitter,
	Store: LocalStore,
	StoreRecord: LocalStoreRecord,
	Timer: LocalTimer,
	getMqDefault: localGetMqDefault,
	setMqDefault: localSetMqDefault,
	// The one context-less emitter every consumer ends up talking to.
	EventEmitter: new LocalEmitter(true),
}));

/**
 * These resolve to whichever copy of the package loaded first, so two copies in
 * one bundle still dispatch to each other. When this copy is the only one - the
 * normal case - they are exactly its own.
 */
export const Emitter = runtime.Emitter as typeof LocalEmitter;
export const Store = runtime.Store as typeof LocalStore;
export const StoreRecord = runtime.StoreRecord as typeof LocalStoreRecord;
export const Timer = runtime.Timer as typeof LocalTimer;

/** The shared, context-less emitter. Cannot be rebound with `in()`. */
export const EventEmitter = runtime.EventEmitter as LocalEmitter;

export const getMqDefault = runtime.getMqDefault as typeof localGetMqDefault;
export const setMqDefault = runtime.setMqDefault as typeof localSetMqDefault;
