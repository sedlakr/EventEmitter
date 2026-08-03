import { bench, describe } from "vitest";

import "../src/index.js";

const { MQ } = globalThis;

const EVENT_NAME = "myevent";
const HANDLER_COUNT = 5000;

/**
 * Fills a fresh store with distinct context/handler pairs.
 * @param {MQ.Store} store
 * @returns {Array.<{ctx: Object, eventHandler: function}>}
 */
function populate(store) {
	const items = [];

	for (let i = 0; i < HANDLER_COUNT; i++) {
		const ctx = {};
		const eventHandler = () => undefined;

		items.push({ ctx, eventHandler });
		store.save(ctx, EVENT_NAME, eventHandler);
	}

	return items;
}

/**
 * Durstenfeld shuffle driven by a seeded LCG rather than Math.random, so the
 * shuffled cases stay comparable between runs.
 * @param {Array} array
 * @param {number} seed
 * @returns {Array}
 */
function shuffle(array, seed) {
	let state = seed;

	for (let i = array.length - 1; i > 0; i--) {
		state = (state * 1103515245 + 12345) % 2147483648;
		const j = state % (i + 1);

		[array[i], array[j]] = [array[j], array[i]];
	}

	return array;
}

/**
 * tinybench has no per-iteration setup hook, so each case pays for populating
 * the store as well as draining it. The `populate only` case below is the
 * baseline to subtract - the removal cost is the difference.
 */
describe(`MQ.Store - draining ${HANDLER_COUNT} handlers`, () => {
	bench("populate only (baseline)", () => {
		populate(new MQ.Store());
	});

	bench("remove by name, ascending", () => {
		const store = new MQ.Store();
		const items = populate(store);

		for (const item of items) {
			store.remove(item.ctx, EVENT_NAME, item.eventHandler);
		}
	});

	bench("remove by name, descending", () => {
		const store = new MQ.Store();
		const items = populate(store);

		for (let i = items.length - 1; i >= 0; i--) {
			store.remove(items[i].ctx, EVENT_NAME, items[i].eventHandler);
		}
	});

	bench("remove by name, shuffled", () => {
		const store = new MQ.Store();
		const items = shuffle(populate(store), 1);

		for (const item of items) {
			store.remove(item.ctx, EVENT_NAME, item.eventHandler);
		}
	});

	bench("remove by context, ascending", () => {
		const store = new MQ.Store();
		const items = populate(store);

		for (const item of items) {
			store.remove(item.ctx);
		}
	});

	bench("remove by context, descending", () => {
		const store = new MQ.Store();
		const items = populate(store);

		for (let i = items.length - 1; i >= 0; i--) {
			store.remove(items[i].ctx);
		}
	});

	bench("remove by context, shuffled", () => {
		const store = new MQ.Store();
		const items = shuffle(populate(store), 1);

		for (const item of items) {
			store.remove(item.ctx);
		}
	});
});
