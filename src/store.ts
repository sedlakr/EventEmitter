import { getMqDefault } from "./context.js";

/** Anything usable as a handler context. */
export type Context = object;

/** A subscribed handler. Params are passed as a single argument, or none. */
export type Handler = (params?: unknown) => unknown;

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
		//TODO: throws a string where every other error path throws an Error.
		//Preserved verbatim - fixing it is a breaking change for anyone
		//catching this, so it belongs in the behaviour-fix pass.
		//eslint-disable-next-line no-throw-literal
		throw ("EventEmitter: Can not make demand on event that has more then one handler. Use EventEmitter.event('" +
			name +
			"') instead.") as unknown as Error;
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
		//NOTE: this path replaces the array without marking the discarded
		//records as removed, so a dispatch already in flight still calls them -
		//unlike the contextual path below. Preserved as-is; see the behaviour
		//fix pass.
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

	request(name: string, params?: unknown): unknown {
		const normalized = name.toLowerCase();

		return request(event(this.store, normalized), normalized, params);
	}

	ctxRequest(ctx: Context, name: string, params?: unknown): unknown {
		const normalized = name.toLowerCase();

		return request(ctxEvent(this.store, ctx, normalized), normalized, params);
	}

	demand(name: string, params?: unknown): unknown {
		const normalized = name.toLowerCase();

		return demand(event(this.store, normalized), normalized, params);
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

Store.prototype.version = "1.0";
