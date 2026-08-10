import { getMqDefault } from "./context.js";

/**
 * Anything usable as a handler context.
 *
 * Contexts are only ever compared by identity, so a primitive works as well as
 * an object and callers do pass strings. `object` would reject those; this is
 * the modern spelling of the `Object` the previous declaration used.
 */
export type Context = NonNullable<unknown>;

/**
 * A subscribed handler. Params are passed as a single argument, or none.
 *
 * The parameter is `any` rather than `unknown` on purpose. An event bus cannot
 * know what a given event carries, and every consumer reaches straight into the
 * payload (`data => use(data[0])`). Typing it `unknown` forces a cast at every
 * subscribe callback for no safety that the caller did not already have.
 * Narrow it per event with the generic on `subscribe` instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export type Handler<T = any> = (params?: T) => unknown;

/**
 * One subscription. `removed` is set before the record is spliced out so that
 * a dispatch already in flight - `evaluate` iterates a clone - skips handlers
 * that unsubscribed during that same dispatch.
 */
export class StoreRecord {
	context: Context;
	handler: Handler;
	removed: boolean;

	constructor(context: Context, handler: Handler) {
		this.context = context;
		this.handler = handler;
		this.removed = false;
	}
}

type StoreData = Record<string, StoreRecord[]>;

/**
 * Returns the record list for an event, creating it on first use.
 */
function event(store: StoreData, name: string): StoreRecord[] {
	let data = store[name];

	//events not exists
	if (!data) {
		data = [];
		store[name] = data;
	}
	return data;
}

/**
 * Returns only the records registered under a given context.
 */
function ctxEvent(store: StoreData, context: Context, name: string): StoreRecord[] {
	const data = event(store, name);

	return data.filter((item) => item.context === context);
}

/**
 * Invokes every live handler. The list is cloned first so that handlers which
 * unsubscribe during dispatch do not shift the iteration out from under it.
 */
function evaluate(data: StoreRecord[], params?: unknown): void {
	//clone data and read length
	const records = data.slice(0);
	const length = records.length;

	//iterate all
	for (let i = 0; i < length; i++) {
		const record = records[i]!;

		//check if is valid
		if (!record.removed) {
			record.handler.apply(record.context, params ? [params] : []);
		}
	}
}

/**
 * Invokes the single handler and returns its value. Exactly one handler must
 * be registered, since a return value is meaningless otherwise.
 */
function request(data: StoreRecord[], name: string, params?: unknown): unknown {
	const length = data.length;

	//error
	if (length === 0) {
		throw new Error("EventEmitter: Can not make request on event that has not handler for '" + name + "'.");
	}
	if (length > 1) {
		throw new Error(
			"EventEmitter: Can not make request on event that has more then one handler. Use EventEmitter.event('" +
				name +
				"') instead.",
		);
	}
	//get record
	const record = data[0]!;
	//check if is valid
	const result = record.handler.apply(record.context, params ? [params] : []);
	//no return
	if (result === undefined) {
		console.warn("EventEmitter: Return from request '" + name + "' is empty! This is might not be valid state.");
	}
	//return
	return result;
}

/**
 * Like `request`, but tolerates having no handler at all and returns
 * `undefined` in that case.
 */
function demand(data: StoreRecord[], name: string, params?: unknown): unknown {
	const length = data.length;
	let result: unknown;

	//error
	if (length > 1) {
		throw new Error(
			"EventEmitter: Can not make demand on event that has more then one handler. Use EventEmitter.event('" +
				name +
				"') instead.",
		);
	}
	//get data if handler exists
	if (length) {
		//get record
		const record = data[0]!;
		//check if is valid
		result = record.handler.apply(record.context, params ? [params] : []);
	}
	//return
	return result;
}

/**
 * Removes the records for one event name.
 */
function removeByName(store: StoreData, context: Context, name: string, handler?: Handler): void {
	const data = event(store, name);

	//clear all, no context set
	if (context === getMqDefault()) {
		//Mark before discarding: `evaluate` iterates a clone, so a dispatch
		//already in flight would otherwise keep calling handlers that this
		//removal just dropped - which is what the contextual branch below
		//prevents via the same flag.
		for (const record of data) {
			record.removed = true;
		}
		store[name] = [];
	} else {
		//iterate all
		for (let i = data.length - 1; i >= 0; i--) {
			const record = data[i]!;
			//remove right context and right handler
			let canRemove = Boolean(handler) && record.context === context && record.handler === handler;
			//remove right context
			canRemove = canRemove || (!handler && record.context === context);

			record.removed = canRemove;
			if (canRemove) {
				data.splice(i, 1);
			}
		}
	}
}

/**
 * Removes every record belonging to a context, across all event names.
 */
function removeByContext(store: StoreData, context: Context): void {
	const isDefault = context === getMqDefault();

	for (const data of Object.values(store)) {
		//iterate all
		for (let i = data.length - 1; i >= 0; i--) {
			const record = data[i]!;
			//remove right context
			const canRemove = record.context === context || isDefault;

			record.removed = canRemove;
			if (canRemove) {
				data.splice(i, 1);
			}
		}
	}
}

/**
 * Store for emitter.
 */
export class Store {
	/** Lives on the prototype, not the instance. */
	declare version: string;

	store: StoreData;

	constructor() {
		this.store = {};
	}

	save(context: Context, name: string, handler: Handler): void {
		//normalize
		const normalized = name.toLowerCase();

		event(this.store, normalized).push(new StoreRecord(context, handler));
	}

	remove(context: Context, name?: string | null, handler?: Handler): void {
		//normalize
		const normalized = name ? name.toLowerCase() : name;

		//remove by name
		if (normalized !== undefined && normalized !== null) {
			removeByName(this.store, context, normalized, handler);
		} else {
			removeByContext(this.store, context);
		}
	}

	evaluate(name: string, params?: unknown): void {
		const normalized = name.toLowerCase();

		evaluate(event(this.store, normalized), params);
	}

	request<T = unknown>(name: string, params?: unknown): T {
		const normalized = name.toLowerCase();

		return request(event(this.store, normalized), normalized, params) as T;
	}

	ctxRequest<T = unknown>(ctx: Context, name: string, params?: unknown): T {
		const normalized = name.toLowerCase();

		return request(ctxEvent(this.store, ctx, normalized), normalized, params) as T;
	}

	demand<T = unknown>(name: string, params?: unknown): T {
		const normalized = name.toLowerCase();

		return demand(event(this.store, normalized), normalized, params) as T;
	}

	watching(name: string): number {
		const normalized = name.toLowerCase();

		return event(this.store, normalized).length;
	}

	ctxWatching(ctx: Context, name: string): number {
		const normalized = name.toLowerCase();

		return ctxEvent(this.store, ctx, normalized).length;
	}
}

Store.prototype.version = __MQ_VERSION__;
