/**
 * Side-effect-free entry point.
 *
 * Everything the library offers, with nothing written to `globalThis`. All
 * emitters still share one registry, so `EventEmitter` here and the global
 * `EventEmitter` installed by the main entry are the same bus.
 */
export { Emitter, type DecoratedHandler } from "./emitter.js";
export { Store, StoreRecord, type Context, type Handler } from "./store.js";
export { Timer } from "./timer.js";
export { getMqDefault, setMqDefault } from "./context.js";

import { Emitter } from "./emitter.js";

/** The shared, context-less emitter. Cannot be rebound with `in()`. */
export const EventEmitter = new Emitter(true);
