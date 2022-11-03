/*global MQ*/
//EventEmitter create
if (globalThis.EventEmitter) {
	console.warn(" EventEmitter already exists on globalThis, redefining");
}
globalThis.EventEmitter = new MQ.Emitter(true); //eslint-disable-line
