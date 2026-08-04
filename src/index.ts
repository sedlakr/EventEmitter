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
// Everything comes from ./pure.js rather than the implementation modules, so
// the globals installed here are the same objects a duplicate copy of the
// package would adopt - one bus, however many copies end up in the bundle.
import { Emitter, Store, Timer, EventEmitter, getMqDefault, setMqDefault } from "./pure.js";

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

// Local aliases so the global declarations below can refer to the instance
// types without shadowing themselves.
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
	// eslint-disable-next-line @typescript-eslint/no-namespace -- a global type namespace cannot be expressed as a module
	namespace MQ {
		type Emitter = EmitterInstance;
		type Store = StoreInstance;
		type Timer = TimerInstance;
	}
}

// A second copy of the package installing the same shared objects is not a
// conflict - it is the registry doing its job. Only warn when the globals were
// put there by something else, which does overwrite a foreign bus.
if (globalThis.MQ && globalThis.MQ.Emitter !== Emitter) {
	console.warn("MQ already exists on globalThis and was defined by another library; redefining");
}

const namespace = { Emitter, Store, Timer } as MQNamespace;

// An accessor rather than a plain property, so writes through `MQ.mqDefault`
// still reach the binding the library compares contexts against.
Object.defineProperty(namespace, "mqDefault", {
	get: getMqDefault,
	set: setMqDefault,
	enumerable: true,
	configurable: true,
});

globalThis.MQ = namespace;

if (globalThis.EventEmitter && globalThis.EventEmitter !== EventEmitter) {
	console.warn("EventEmitter already exists on globalThis and was defined by another library; redefining");
}
globalThis.EventEmitter = EventEmitter;
