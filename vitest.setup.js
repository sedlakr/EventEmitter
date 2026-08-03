// Populates globalThis.MQ and globalThis.EventEmitter, which every spec uses.
// Runs once per test file, so each file gets its own MQ.Store instance.
import "./src/index.ts";
