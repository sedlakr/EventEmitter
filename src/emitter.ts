import { getMqDefault } from "./context.js";
import { Store, type Context, type Handler } from "./store.js";
import { Timer } from "./timer.js";

/**
 * Handlers are decorated in place with bookkeeping the emitter needs to undo a
 * subscription later.
 *
 * This mutates the caller's own function, which means two emitters sharing one
 * handler function also share its `handlers` list. That is a real flaw, but
 * `test/mq.js` asserts on `handler.handlers.length` directly and callers can
 * observe these properties, so replacing it with a WeakMap is deferred to the
 * internals pass rather than smuggled into a type-only port.
 */
export interface DecoratedHandler {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see the note on Handler in store.ts
	(...args: any[]): unknown;
	/** On a subscriber: the bound wrappers created for it, one per binding. */
	handlers?: DecoratedHandler[];
	/** On a bound wrapper: the function actually passed to addEventListener. */
	eventDoneRuntime?: (event: Event) => void;
	tripleClickHandler?: (event: Event) => void;
	tripleDblClickHandler?: (event: Event) => void;
	element?: EventTarget | null;
	type?: string;
	context?: Context;
}

interface NotifyQueueItem {
	name: string;
	params?: unknown;
}

/** Element/document/window subscriptions and plain named events differ here. */
interface SubscribeParams {
	element: EventTarget | null;
	name: string;
	handler: DecoratedHandler;
	params: unknown[];
}

interface UnsubscribeParams {
	element: EventTarget | null;
	name: string | null;
	handler: DecoratedHandler | null;
}

/**
 * Every emitter instance shares one registry - `create()` hands out a new
 * instance bound to a different context, not a separate event bus. The notify
 * queue and debug flags are process-wide for the same reason.
 */
let timer: Timer | null = null;
const notifyQueue: NotifyQueueItem[] = [];
let debugFilters: string[] = [];
let debugMode = false;
let simpleMode: boolean | undefined = false;
const store = new Store();

/**
 * Binds a DOM listener, routing the two synthetic event types the library
 * supports.
 */
function addEvent(
	element: EventTarget,
	eventType: string,
	handler: DecoratedHandler,
	eventOptions?: boolean | AddEventListenerOptions,
): void {
	//tripleclick
	if (eventType === "tripleclick") {
		addTripleClick(element, handler);
		return;
	}

	handler.eventDoneRuntime =
		handler.eventDoneRuntime ||
		function (e: Event) {
			handler((globalThis as { event?: Event }).event || e);
		};

	element.addEventListener(eventType, handler.eventDoneRuntime, eventOptions ?? false);
	//for firefox
	if (eventType === "mousewheel") {
		//NOTE: recurses with the wrapper, not the original handler, exactly as
		//before - the wrapper then gets a wrapper of its own.
		addEvent(element, "DOMMouseScroll", handler.eventDoneRuntime as DecoratedHandler);
	}
}

/**
 * Unbinds a DOM listener bound through `addEvent`.
 */
function removeEvent(element: EventTarget, eventType: string, handler: DecoratedHandler): void {
	//tripleclick
	if (eventType === "tripleclick") {
		removeTripleClick(element, handler);
		return;
	}
	if (handler.eventDoneRuntime) {
		element.removeEventListener(eventType, handler.eventDoneRuntime);
	}
	//for firefox
	if (eventType === "mousewheel") {
		removeEvent(element, "DOMMouseScroll", handler.eventDoneRuntime as DecoratedHandler);
	}
	//remove data
	cleanHandlerData(handler);
}

/**
 * Synthesises a triple click from three clicks inside 400 ms.
 */
function addTripleClick(el: EventTarget, handler: DecoratedHandler): void {
	let clickCount = 0;
	let clickStart = 0;

	handler.tripleDblClickHandler = function (event: Event) {
		if (!document.body.addEventListener) {
			handler.tripleClickHandler!(event || (globalThis as { event?: Event }).event);
		}
	};

	handler.tripleClickHandler = function (event: Event) {
		//event convert
		event = event || (globalThis as { event?: Event }).event;
		//check date
		if (clickStart > new Date().getTime() - 400) {
			clickCount += 1;
			if (clickCount === 3) {
				clickCount = 0;
				handler(event);
			}
		} else {
			clickCount = 1;
			clickStart = 0;
		}
		//click start
		if (!clickStart) {
			clickStart = new Date().getTime();
		}
	};

	addEvent(el, "click", handler.tripleClickHandler as DecoratedHandler);
	addEvent(el, "dblclick", handler.tripleDblClickHandler as DecoratedHandler);
}

function removeTripleClick(el: EventTarget, handler: DecoratedHandler): void {
	removeEvent(el, "click", handler.tripleClickHandler as DecoratedHandler);
	removeEvent(el, "dblclick", handler.tripleDblClickHandler as DecoratedHandler);
	//remove data
	cleanTripleClickHandlerData(handler);
	cleanHandlerData(handler);
}

function cleanHandlerData(handler: DecoratedHandler): void {
	delete handler.element;
	delete handler.type;
	delete handler.context;
}

function cleanTripleClickHandlerData(handler: DecoratedHandler): void {
	delete handler.tripleClickHandler;
	delete handler.tripleDblClickHandler;
}

function stopPropagation(e: Event): void {
	(e as { cancelBubble: boolean }).cancelBubble = true;
	if (e.stopPropagation !== undefined) {
		e.stopPropagation();
	}
}

function cancelDefault(e: Event): boolean {
	const evt = e ? e : (globalThis as { event?: Event }).event!;

	if (evt.preventDefault) {
		evt.preventDefault();
	}
	(evt as { returnValue?: boolean }).returnValue = false;
	return false;
}

/**
 * Accepts either `(name, handler, params)` or `(element, name, handler, params)`.
 */
function normalizeSubscribeParams(
	nameOrElement: EventTarget | string,
	nameOrHandler: string | DecoratedHandler,
	handler?: DecoratedHandler,
	paramsOrUndefined?: unknown[],
): SubscribeParams {
	//type 1
	if (typeof nameOrElement === "string" && typeof nameOrHandler === "function") {
		return {
			element: null,
			name: nameOrElement,
			handler: nameOrHandler,
			params: paramsOrUndefined || [],
		};
	}

	//type 2
	const target = nameOrElement as Node;
	const isElement = target.nodeType && target.nodeType === 1;
	const isDocument = target === (document as unknown as Node);
	const isWindow = (target as unknown) === globalThis;

	//check
	if ((isElement || isWindow || isDocument) && typeof nameOrHandler === "string" && typeof handler === "function") {
		return {
			element: nameOrElement as EventTarget,
			name: nameOrHandler,
			handler: handler,
			params: paramsOrUndefined || [],
		};
	}

	//error
	throw new Error("EventEmitter: Incorrect parameters given into function subscribe() or unsubscribe().");
}

/**
 * Same shapes as above, plus the no-argument form meaning "everything for this
 * context".
 */
function normalizeUnsubscribeParams(
	nameOrElement?: EventTarget | string,
	nameOrHandler?: string | DecoratedHandler,
	handler?: DecoratedHandler,
): UnsubscribeParams | null {
	//type 1
	if (nameOrElement === undefined || nameOrHandler === undefined) {
		return {
			element: null,
			name: null,
			handler: null,
		};
	}

	//type 2
	if (typeof nameOrElement === "string" && typeof nameOrHandler === "function") {
		return {
			element: null,
			name: nameOrElement,
			handler: nameOrHandler,
		};
	}

	//type 3
	const target = nameOrElement as Node;
	const isElement = target.nodeType && target.nodeType === 1;
	const isDocument = target === (document as unknown as Node);
	const isWindow = (target as unknown) === globalThis;

	//check
	if ((isElement || isWindow || isDocument) && typeof nameOrHandler === "string" && typeof handler === "function") {
		return {
			element: nameOrElement as EventTarget,
			name: nameOrHandler,
			handler: handler,
		};
	}

	return null;
}

function debugReporter(type: string, eventName: string, message: string, data: unknown): void {
	//do not debug if not right mode
	if (!console || !debugMode) {
		return;
	}
	//ignore all events in filter
	if (debugFilters.indexOf(eventName) >= 0) {
		return;
	}
	//get display fnc
	const target = console as unknown as Record<string, (...args: unknown[]) => void>;

	if (target[type]) {
		target[type]!("EventEmitter: (" + new Date().toLocaleTimeString() + ") " + message, simpleMode ? "" : data);
	} else {
		console.info("EventEmitter: (" + new Date().toLocaleTimeString() + ") " + message, simpleMode ? "" : data);
	}
}

function runQueue(): void {
	let queue = notifyQueue.shift();

	while (queue) {
		store.evaluate(queue.name, queue.params);
		queue = notifyQueue.shift();
	}
}

/**
 * Element bindings indexed by the context that created them.
 *
 * `unsubscribe()` with no arguments has to drain a context's DOM listeners,
 * and the per-subscriber `handlers` list cannot answer "everything for this
 * context" - it is reachable only from a handler the caller still holds.
 *
 * Keyed weakly so a context that is dropped without being unsubscribed takes
 * its binding list with it rather than pinning elements in this module.
 */
const bindingsByContext = new WeakMap<Context, ElementBinding[]>();

interface ElementBinding {
	element: EventTarget;
	type: string;
	/** The caller's function, whose `handlers` list also has to be pruned. */
	subscriber: DecoratedHandler;
	/** The wrapper actually registered with the DOM. */
	bound: DecoratedHandler;
}

/**
 * Wraps a subscriber so the DOM hands it `[event, ...params]` bound to the
 * emitter's context, and records it on the handler for later removal.
 */
function createHandler(context: Context, data: SubscribeParams): DecoratedHandler {
	//create name by event name
	const handlers = (data.handler.handlers = data.handler.handlers || []);

	const handler: DecoratedHandler = function (...args: unknown[]) {
		const event = args[0] as Event;

		data.handler.apply(context, [[event as unknown].concat(data.params)]);
	};

	handler.element = data.element;
	handler.type = data.name;
	handler.context = context;
	//add
	handlers.push(handler);

	//index by context so a no-argument unsubscribe can find it
	const bindings = bindingsByContext.get(context) || [];

	bindings.push({
		element: data.element as EventTarget,
		type: data.name,
		subscriber: data.handler,
		bound: handler,
	});
	bindingsByContext.set(context, bindings);

	return handler;
}

/**
 * Drops one binding from the context index, once its listener is gone.
 */
function forgetBinding(context: Context, bound: DecoratedHandler): void {
	const bindings = bindingsByContext.get(context);

	if (!bindings) {
		return;
	}

	const index = bindings.findIndex((binding) => binding.bound === bound);

	if (index >= 0) {
		bindings.splice(index, 1);
	}
}

/**
 * Unbinds every element listener registered under a context.
 *
 * This is what makes `emitter.unsubscribe()` actually tear down DOM
 * subscriptions, which the README has always claimed it does.
 */
function destroyHandlersByContext(context: Context): void {
	const bindings = bindingsByContext.get(context);

	if (!bindings) {
		return;
	}

	for (const binding of bindings.slice(0)) {
		removeEvent(binding.element, binding.type, binding.bound);

		//keep the subscriber's own list in step
		const handlers = binding.subscriber.handlers;

		if (handlers) {
			const index = handlers.indexOf(binding.bound);

			if (index >= 0) {
				handlers.splice(index, 1);
			}
		}
	}

	bindingsByContext.delete(context);
}

/**
 * Removes the bound handlers matching element + type + context.
 */
function destroyHandler(context: Context, data: UnsubscribeParams): void {
	const newHandlers: DecoratedHandler[] = [];
	const currentType = data.name;
	const currentElement = data.element;
	const handlers = data.handler!.handlers || [];

	//iterate all
	for (let i = handlers.length - 1; i >= 0; i--) {
		const currentHandler = handlers[i]!;

		//for this element
		if (
			currentHandler.element === currentElement &&
			currentType === currentHandler.type &&
			currentHandler.context === context
		) {
			//remove event
			removeEvent(data.element!, data.name!, currentHandler as DecoratedHandler);
			forgetBinding(context, currentHandler);
		} else {
			newHandlers.push(currentHandler);
		}
	}

	//save new handlers
	data.handler!.handlers = newHandlers;
}

/**
 * Emitter.
 */
export class Emitter {
	/** Lives on the prototype, not the instance. */
	declare version: string;

	/** Installed on the prototype by `debugMode(true)` and removed by `false`. */
	declare getStore?: () => Store;

	context: Context;
	isStatic: boolean;

	constructor(isStatic?: boolean) {
		this.context = getMqDefault();
		this.isStatic = isStatic || false;
	}

	/**
	 * Creates a new emitter bound to `context`, sharing the same registry.
	 */
	create(context: Context): Emitter {
		return new Emitter().in(context);
	}

	/**
	 * Dispatches synchronously.
	 */
	event(name: string, params?: unknown): this {
		debugReporter("debug", name, "Event for '" + name + "' send with parameters ", params);
		//evaluate
		store.evaluate(name, params);
		//return self
		return this;
	}

	/**
	 * Queues a dispatch onto the shared 30 ms timer.
	 */
	notify(name: string, params?: unknown): Timer {
		//reporter
		debugReporter("debug", name, "Notify for '" + name + "' send with parameters ", params);
		//save queue
		notifyQueue.push({ name, params });
		//timer not exists, run it
		if (!timer) {
			timer = new Timer(30, function () {
				runQueue();
				timer!.cancel();
				timer = null;
			});
			//run
			timer.run();
		}
		//return timer
		return timer;
	}

	/**
	 * Dispatches to exactly one handler and returns its value.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- defaults to the pre-2.0 contract; pass T to narrow
	request<T = any>(name: string, params?: unknown): T {
		//evaluate and return response
		const returnValue = store.request<T>(name, params);

		//reporter
		debugReporter("debug", name, "Request for '" + name + "' return '" + returnValue + "' for parameters ", params);
		//return data
		return returnValue;
	}

	/**
	 * As `request`, restricted to handlers sharing this emitter's context.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- defaults to the pre-2.0 contract; pass T to narrow
	ctxRequest<T = any>(name: string, params?: unknown): T {
		const ctx = this.context;

		if (ctx === getMqDefault()) {
			throw new Error(
				"Request with context is available only on instances with custom context. Current context is default. ",
			);
		}

		//evaluate and return response
		const returnValue = store.ctxRequest<T>(ctx, name, params);

		//reporter
		debugReporter(
			"debug",
			name,
			"Context request for '" + name + "' return '" + returnValue + "' for parameters ",
			params,
		);
		//return data
		return returnValue;
	}

	/**
	 * As `request`, but tolerates having no handler.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- defaults to the pre-2.0 contract; pass T to narrow
	demand<T = any>(name: string, params?: unknown): T {
		//evaluate and return response
		const returnValue = store.demand<T>(name, params);

		//reporter
		debugReporter("debug", name, "Demand for '" + name + "' return '" + returnValue + "' for parameters ", params);
		//return data
		return returnValue;
	}

	/**
	 * How many handlers listen to an event.
	 */
	watching(name: string): number {
		//evaluate and return response
		const count = store.watching(name);

		//reporter
		debugReporter("debug", name, "Watching count status for '" + name + "' return '" + count, []);
		//return data
		return count;
	}

	/**
	 * As `watching`, restricted to this emitter's context.
	 */
	ctxWatching(name: string): number {
		const ctx = this.context;

		if (ctx === getMqDefault()) {
			throw new Error(
				"Watching with context is available only on instances with custom context. Current context is default. ",
			);
		}

		//evaluate and return response
		const count = store.ctxWatching(ctx, name);

		//reporter
		debugReporter("debug", name, "Context watching count status for '" + name + "' return '" + count, []);
		//return data
		return count;
	}

	/**
	 * Subscribes to a named event, or to a DOM event on an element.
	 */
	subscribe(
		nameOrElement: EventTarget | string,
		nameOrHandler: string | DecoratedHandler,
		handlerOrUndefined?: DecoratedHandler,
		paramsOrUndefined?: unknown[],
		eventOptions?: boolean | AddEventListenerOptions,
	): this {
		const context = this.context;
		const data = normalizeSubscribeParams(nameOrElement, nameOrHandler, handlerOrUndefined, paramsOrUndefined);

		//for element
		if (data.element) {
			addEvent(data.element, data.name, createHandler(context, data) as DecoratedHandler, eventOptions);
			//no element event
		} else {
			//save to storage
			store.save(this.context, data.name, data.handler as Handler);
		}
		//return self
		return this;
	}

	/**
	 * Stops listening. With no arguments, drops everything for this context.
	 */
	unsubscribe(
		nameOrElement?: EventTarget | string,
		nameOrHandler?: string | DecoratedHandler,
		handlerOrUndefined?: DecoratedHandler,
	): this {
		const data = normalizeUnsubscribeParams(nameOrElement, nameOrHandler, handlerOrUndefined)!;

		//this is weird
		if (this.context === getMqDefault() && !data.name && !data.handler) {
			console.warn(
				"EventEmitter: You are calling unsubscribe method without parameters. This is unbind all event through application!",
			);
		}

		if (data.element) {
			//destroy handler
			destroyHandler(this.context, data);

			//no element event
		} else {
			//remove from storage
			store.remove(this.context, data.name, data.handler as Handler);

			//a bare unsubscribe() means "everything for this context", which
			//includes element bindings - not just the named-event registry
			if (!data.name && !data.handler) {
				destroyHandlersByContext(this.context);
			}
		}
		//return self
		return this;
	}

	/**
	 * Helper for stopping a browser event.
	 */
	interrupt(event: Event, stopProp?: boolean, cancelDef?: boolean): void {
		if (stopProp) {
			stopPropagation(event);
		}
		if (cancelDef) {
			cancelDefault(event);
		}
	}

	/**
	 * Rebinds this emitter to another context. Not allowed on the static one.
	 */
	in(context: Context): this {
		const isStatic = this.isStatic;

		//static
		if (isStatic) {
			throw new Error(
				"EventEmitter: Can not change context on static method. Use EventEmitter.create() with right context.",
			);
		}
		//set new context
		this.context = context;
		//return it
		return this;
	}

	/**
	 * Turns console reporting on or off, process-wide.
	 */
	debugMode(state: boolean, filters?: string[], simple?: boolean): void {
		debugFilters = filters || [];
		debugMode = state;
		simpleMode = simple;
		// store getter when debug mode is on
		if (state) {
			Emitter.prototype.getStore = function () {
				return store;
			};
		} else {
			Emitter.prototype.getStore = undefined;
		}
		console.info(
			"EventEmitter debug mode is set to " + (state ? "on" : "off") + " " + (simple ? "with simple mode" : ""),
		);
	}
}

Emitter.prototype.version = __MQ_VERSION__;

/** Exposed so the global namespace can hand out the shared registry. */
export function getSharedStore(): Store {
	return store;
}
