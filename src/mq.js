if (globalThis.MQ) {
	console.warn("MQ already exists on globalThis, redefining");
}
globalThis.MQ = {};
