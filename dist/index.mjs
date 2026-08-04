/*! @sedlak.r/mq@2.0.0-rc.4 */
import { a as StoreRecord, i as Store, n as Emitter, o as getMqDefault, r as Timer, s as setMqDefault, t as EventEmitter } from "./chunks/pure-nSt1URWh.mjs";
//#region src/index.ts
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
if (globalThis.MQ) console.warn("MQ already exists on globalThis, redefining");
var namespace = {
	Emitter,
	Store,
	Timer
};
Object.defineProperty(namespace, "mqDefault", {
	get: getMqDefault,
	set: setMqDefault,
	enumerable: true,
	configurable: true
});
globalThis.MQ = namespace;
if (globalThis.EventEmitter) console.warn(" EventEmitter already exists on globalThis, redefining");
globalThis.EventEmitter = EventEmitter;
//#endregion
export { Emitter, EventEmitter, Store, StoreRecord, Timer, getMqDefault, setMqDefault };
