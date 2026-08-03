/*! @sedlak.r/mq@2.0.0-rc.1 */
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_pure = require("./chunks/pure-BFOHf23Y.js");
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
	Emitter: require_pure.Emitter,
	Store: require_pure.Store,
	Timer: require_pure.Timer
};
Object.defineProperty(namespace, "mqDefault", {
	get: require_pure.getMqDefault,
	set: require_pure.setMqDefault,
	enumerable: true,
	configurable: true
});
globalThis.MQ = namespace;
if (globalThis.EventEmitter) console.warn(" EventEmitter already exists on globalThis, redefining");
globalThis.EventEmitter = require_pure.EventEmitter;
//#endregion
exports.Emitter = require_pure.Emitter;
exports.EventEmitter = require_pure.EventEmitter;
exports.Store = require_pure.Store;
exports.StoreRecord = require_pure.StoreRecord;
exports.Timer = require_pure.Timer;
exports.getMqDefault = require_pure.getMqDefault;
exports.setMqDefault = require_pure.setMqDefault;
