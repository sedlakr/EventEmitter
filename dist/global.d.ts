/**
 * Entry for the classic-script bundles (`dist/mq.js`, `dist/mq.min.js`).
 *
 * It deliberately exports nothing. An entry with exports makes the bundler
 * wrap the IIFE in `var MQ = (function(){...})()`, which would overwrite the
 * namespace the library installs itself.
 */
import "./index.js";
