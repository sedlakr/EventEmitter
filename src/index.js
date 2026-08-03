/**
 * Library entry point.
 *
 * These modules are not ES modules internally - each one attaches itself to the
 * global `MQ` namespace created by `./mq.js`. Import order is therefore load
 * order and must match the order the files were concatenated in previously:
 * `mq.js` creates the namespace, `mq.static.js` consumes the finished
 * `MQ.Emitter` to publish `globalThis.EventEmitter`.
 *
 * Side-effect imports are evaluated in source order, so this reproduces the
 * old concat build exactly.
 */
import "./mq.js";
import "./data/mq.timer.js";
import "./data/mq.store.js";
import "./data/mq.emitter.js";
import "./mq.static.js";
