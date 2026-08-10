/*! @sedlak.r/mq@2.0.0 */
(function() {
	//#region src/context.ts
	/**
	* The sentinel context meaning "no context was set".
	*
	* Emitters constructed without a context get this, and both the store and the
	* emitter branch on identity against it - a default-context unsubscribe clears
	* everything, a custom-context one clears only its own records.
	*
	* It was previously the public, writable `MQ.mqDefault`, so it stays mutable
	* here and the global namespace exposes it as an accessor pointing at this
	* same binding.
	*/
	var state = { mqDefault: globalThis };
	function getMqDefault$1() {
		return state.mqDefault;
	}
	function setMqDefault$1(value) {
		state.mqDefault = value;
	}
	//#endregion
	//#region src/store.ts
	/**
	* One subscription. `removed` is set before the record is spliced out so that
	* a dispatch already in flight - `evaluate` iterates a clone - skips handlers
	* that unsubscribed during that same dispatch.
	*/
	var StoreRecord$1 = class {
		context;
		handler;
		removed;
		constructor(context, handler) {
			this.context = context;
			this.handler = handler;
			this.removed = false;
		}
	};
	/**
	* Returns the record list for an event, creating it on first use.
	*/
	function event(store, name) {
		let data = store[name];
		if (!data) {
			data = [];
			store[name] = data;
		}
		return data;
	}
	/**
	* Returns only the records registered under a given context.
	*/
	function ctxEvent(store, context, name) {
		return event(store, name).filter((item) => item.context === context);
	}
	/**
	* Invokes every live handler. The list is cloned first so that handlers which
	* unsubscribe during dispatch do not shift the iteration out from under it.
	*/
	function evaluate(data, params) {
		const records = data.slice(0);
		const length = records.length;
		for (let i = 0; i < length; i++) {
			const record = records[i];
			if (!record.removed) record.handler.apply(record.context, params ? [params] : []);
		}
	}
	/**
	* Invokes the single handler and returns its value. Exactly one handler must
	* be registered, since a return value is meaningless otherwise.
	*/
	function request(data, name, params) {
		const length = data.length;
		if (length === 0) throw new Error("EventEmitter: Can not make request on event that has not handler for '" + name + "'.");
		if (length > 1) throw new Error("EventEmitter: Can not make request on event that has more then one handler. Use EventEmitter.event('" + name + "') instead.");
		const record = data[0];
		const result = record.handler.apply(record.context, params ? [params] : []);
		if (result === void 0) console.warn("EventEmitter: Return from request '" + name + "' is empty! This is might not be valid state.");
		return result;
	}
	/**
	* Like `request`, but tolerates having no handler at all and returns
	* `undefined` in that case.
	*/
	function demand(data, name, params) {
		const length = data.length;
		let result;
		if (length > 1) throw new Error("EventEmitter: Can not make demand on event that has more then one handler. Use EventEmitter.event('" + name + "') instead.");
		if (length) {
			const record = data[0];
			result = record.handler.apply(record.context, params ? [params] : []);
		}
		return result;
	}
	/**
	* Removes the records for one event name.
	*/
	function removeByName(store, context, name, handler) {
		const data = event(store, name);
		if (context === getMqDefault$1()) {
			for (const record of data) record.removed = true;
			store[name] = [];
		} else for (let i = data.length - 1; i >= 0; i--) {
			const record = data[i];
			let canRemove = Boolean(handler) && record.context === context && record.handler === handler;
			canRemove = canRemove || !handler && record.context === context;
			record.removed = canRemove;
			if (canRemove) data.splice(i, 1);
		}
	}
	/**
	* Removes every record belonging to a context, across all event names.
	*/
	function removeByContext(store, context) {
		const isDefault = context === getMqDefault$1();
		for (const data of Object.values(store)) for (let i = data.length - 1; i >= 0; i--) {
			const record = data[i];
			const canRemove = record.context === context || isDefault;
			record.removed = canRemove;
			if (canRemove) data.splice(i, 1);
		}
	}
	/**
	* Store for emitter.
	*/
	var Store$1 = class {
		store;
		constructor() {
			this.store = {};
		}
		save(context, name, handler) {
			const normalized = name.toLowerCase();
			event(this.store, normalized).push(new StoreRecord$1(context, handler));
		}
		remove(context, name, handler) {
			const normalized = name ? name.toLowerCase() : name;
			if (normalized !== void 0 && normalized !== null) removeByName(this.store, context, normalized, handler);
			else removeByContext(this.store, context);
		}
		evaluate(name, params) {
			const normalized = name.toLowerCase();
			evaluate(event(this.store, normalized), params);
		}
		request(name, params) {
			const normalized = name.toLowerCase();
			return request(event(this.store, normalized), normalized, params);
		}
		ctxRequest(ctx, name, params) {
			const normalized = name.toLowerCase();
			return request(ctxEvent(this.store, ctx, normalized), normalized, params);
		}
		demand(name, params) {
			const normalized = name.toLowerCase();
			return demand(event(this.store, normalized), normalized, params);
		}
		watching(name) {
			const normalized = name.toLowerCase();
			return event(this.store, normalized).length;
		}
		ctxWatching(ctx, name) {
			const normalized = name.toLowerCase();
			return ctxEvent(this.store, ctx, normalized).length;
		}
	};
	Store$1.prototype.version = "2.0.0";
	//#endregion
	//#region src/timer.ts
	/**
	* Timer for emitter.
	*
	* Wraps a single `setTimeout`. `notify()` batches through this, and the 30 ms
	* default is observable public API - the README documents it and the specs
	* assert on it - so it must not become a microtask.
	*/
	var Timer$1 = class {
		timeout;
		timer;
		callback;
		constructor(timeout, callback) {
			this.timeout = timeout || 30;
			this.timer = 0;
			this.callback = callback;
		}
		/**
		* Starts the timer. Calling it again while already running is a no-op.
		*/
		run() {
			if (this.timer) return;
			this.timer = setTimeout(() => {
				this.cancel();
				this.callback();
			}, this.timeout);
		}
		/**
		* Stops a running timer. Safe to call when it is not running.
		*/
		cancel() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = 0;
			}
		}
	};
	Timer$1.prototype.version = "2.0.0";
	//#endregion
	//#region src/emitter.ts
	/**
	* Every emitter instance shares one registry - `create()` hands out a new
	* instance bound to a different context, not a separate event bus. The notify
	* queue and debug flags are process-wide for the same reason.
	*/
	var timer = null;
	var notifyQueue = [];
	var debugFilters = [];
	var debugMode = false;
	var simpleMode = false;
	var store = new Store$1();
	/**
	* Binds a DOM listener, routing the two synthetic event types the library
	* supports.
	*/
	function addEvent(element, eventType, handler, eventOptions) {
		if (eventType === "tripleclick") {
			addTripleClick(element, handler);
			return;
		}
		handler.eventDoneRuntime = handler.eventDoneRuntime || function(e) {
			handler(globalThis.event || e);
		};
		element.addEventListener(eventType, handler.eventDoneRuntime, eventOptions ?? false);
		if (eventType === "mousewheel") addEvent(element, "DOMMouseScroll", handler.eventDoneRuntime);
	}
	/**
	* Unbinds a DOM listener bound through `addEvent`.
	*/
	function removeEvent(element, eventType, handler) {
		if (eventType === "tripleclick") {
			removeTripleClick(element, handler);
			return;
		}
		if (handler.eventDoneRuntime) element.removeEventListener(eventType, handler.eventDoneRuntime);
		if (eventType === "mousewheel") removeEvent(element, "DOMMouseScroll", handler.eventDoneRuntime);
		cleanHandlerData(handler);
	}
	/**
	* Synthesises a triple click from three clicks inside 400 ms.
	*/
	function addTripleClick(el, handler) {
		let clickCount = 0;
		let clickStart = 0;
		handler.tripleDblClickHandler = function(event) {
			if (!document.body.addEventListener) handler.tripleClickHandler(event || globalThis.event);
		};
		handler.tripleClickHandler = function(event) {
			event = event || globalThis.event;
			if (clickStart > (/* @__PURE__ */ new Date()).getTime() - 400) {
				clickCount += 1;
				if (clickCount === 3) {
					clickCount = 0;
					handler(event);
				}
			} else {
				clickCount = 1;
				clickStart = 0;
			}
			if (!clickStart) clickStart = (/* @__PURE__ */ new Date()).getTime();
		};
		addEvent(el, "click", handler.tripleClickHandler);
		addEvent(el, "dblclick", handler.tripleDblClickHandler);
	}
	function removeTripleClick(el, handler) {
		removeEvent(el, "click", handler.tripleClickHandler);
		removeEvent(el, "dblclick", handler.tripleDblClickHandler);
		cleanTripleClickHandlerData(handler);
		cleanHandlerData(handler);
	}
	function cleanHandlerData(handler) {
		delete handler.element;
		delete handler.type;
		delete handler.context;
	}
	function cleanTripleClickHandlerData(handler) {
		delete handler.tripleClickHandler;
		delete handler.tripleDblClickHandler;
	}
	function stopPropagation(e) {
		e.cancelBubble = true;
		if (e.stopPropagation !== void 0) e.stopPropagation();
	}
	function cancelDefault(e) {
		const evt = e ? e : globalThis.event;
		if (evt.preventDefault) evt.preventDefault();
		evt.returnValue = false;
		return false;
	}
	/**
	* Accepts either `(name, handler, params)` or `(element, name, handler, params)`.
	*/
	function normalizeSubscribeParams(nameOrElement, nameOrHandler, handler, paramsOrUndefined) {
		if (typeof nameOrElement === "string" && typeof nameOrHandler === "function") return {
			element: null,
			name: nameOrElement,
			handler: nameOrHandler,
			params: paramsOrUndefined || []
		};
		const target = nameOrElement;
		if ((target.nodeType && target.nodeType === 1 || target === globalThis || target === document) && typeof nameOrHandler === "string" && typeof handler === "function") return {
			element: nameOrElement,
			name: nameOrHandler,
			handler,
			params: paramsOrUndefined || []
		};
		throw new Error("EventEmitter: Incorrect parameters given into function subscribe() or unsubscribe().");
	}
	/**
	* Same shapes as above, plus the name-only and no-argument forms.
	*
	* The name-only branch has to come first. It used to fall into the catch-all
	* below, so `unsubscribe(name)` was silently read as `unsubscribe()` and dropped
	* every subscription for the context - on the default context, every
	* subscription in the application.
	*/
	function normalizeUnsubscribeParams(nameOrElement, nameOrHandler, handler) {
		if (typeof nameOrElement === "string" && nameOrHandler === void 0) return {
			element: null,
			name: nameOrElement,
			handler: null
		};
		if (nameOrElement === void 0 || nameOrHandler === void 0) return {
			element: null,
			name: null,
			handler: null
		};
		if (typeof nameOrElement === "string" && typeof nameOrHandler === "function") return {
			element: null,
			name: nameOrElement,
			handler: nameOrHandler
		};
		const target = nameOrElement;
		if ((target.nodeType && target.nodeType === 1 || target === globalThis || target === document) && typeof nameOrHandler === "string" && typeof handler === "function") return {
			element: nameOrElement,
			name: nameOrHandler,
			handler
		};
		return null;
	}
	function debugReporter(type, eventName, message, data) {
		if (!console || !debugMode) return;
		if (debugFilters.indexOf(eventName) >= 0) return;
		const target = console;
		if (target[type]) target[type]("EventEmitter: (" + (/* @__PURE__ */ new Date()).toLocaleTimeString() + ") " + message, simpleMode ? "" : data);
		else console.info("EventEmitter: (" + (/* @__PURE__ */ new Date()).toLocaleTimeString() + ") " + message, simpleMode ? "" : data);
	}
	function runQueue() {
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
	* Object contexts are held weakly, so one dropped without being unsubscribed
	* takes its binding list with it rather than pinning elements in this module.
	* A context is not necessarily an object though: `create()` may be called with
	* no argument at all, and callers pass strings. Those cannot be WeakMap keys,
	* so they get an ordinary Map.
	*/
	var weakBindings = /* @__PURE__ */ new WeakMap();
	var keyedBindings = /* @__PURE__ */ new Map();
	/** Whether a context can be used as a WeakMap key. */
	function isWeakKeyable(context) {
		return typeof context === "object" && context !== null || typeof context === "function";
	}
	function getBindings(context) {
		return isWeakKeyable(context) ? weakBindings.get(context) : keyedBindings.get(context);
	}
	function setBindings(context, bindings) {
		if (isWeakKeyable(context)) weakBindings.set(context, bindings);
		else keyedBindings.set(context, bindings);
	}
	function deleteBindings(context) {
		if (isWeakKeyable(context)) weakBindings.delete(context);
		else keyedBindings.delete(context);
	}
	/**
	* Wraps a subscriber so the DOM hands it `[event, ...params]` bound to the
	* emitter's context, and records it on the handler for later removal.
	*/
	function createHandler(context, data) {
		const handlers = data.handler.handlers = data.handler.handlers || [];
		const handler = function(...args) {
			const event = args[0];
			data.handler.apply(context, [[event].concat(data.params)]);
		};
		handler.element = data.element;
		handler.type = data.name;
		handler.context = context;
		handlers.push(handler);
		const bindings = getBindings(context) || [];
		bindings.push({
			element: data.element,
			type: data.name,
			subscriber: data.handler,
			bound: handler
		});
		setBindings(context, bindings);
		return handler;
	}
	/**
	* Drops one binding from the context index, once its listener is gone.
	*/
	function forgetBinding(context, bound) {
		const bindings = getBindings(context);
		if (!bindings) return;
		const index = bindings.findIndex((binding) => binding.bound === bound);
		if (index >= 0) bindings.splice(index, 1);
	}
	/**
	* Unbinds every element listener registered under a context.
	*
	* This is what makes `emitter.unsubscribe()` actually tear down DOM
	* subscriptions, which the README has always claimed it does.
	*/
	function destroyHandlersByContext(context) {
		const bindings = getBindings(context);
		if (!bindings) return;
		for (const binding of bindings.slice(0)) {
			removeEvent(binding.element, binding.type, binding.bound);
			const handlers = binding.subscriber.handlers;
			if (handlers) {
				const index = handlers.indexOf(binding.bound);
				if (index >= 0) handlers.splice(index, 1);
			}
		}
		deleteBindings(context);
	}
	/**
	* Removes the bound handlers matching element + type + context.
	*/
	function destroyHandler(context, data) {
		const newHandlers = [];
		const currentType = data.name;
		const currentElement = data.element;
		const handlers = data.handler.handlers || [];
		for (let i = handlers.length - 1; i >= 0; i--) {
			const currentHandler = handlers[i];
			if (currentHandler.element === currentElement && currentType === currentHandler.type && currentHandler.context === context) {
				removeEvent(data.element, data.name, currentHandler);
				forgetBinding(context, currentHandler);
			} else newHandlers.push(currentHandler);
		}
		data.handler.handlers = newHandlers;
	}
	/**
	* Emitter.
	*/
	var Emitter$1 = class Emitter$1 {
		context;
		isStatic;
		constructor(isStatic) {
			this.context = getMqDefault$1();
			this.isStatic = isStatic || false;
		}
		/**
		* Creates a new emitter bound to `context`, sharing the same registry.
		*
		* `context` is optional: callers do use `create()` with no argument, which
		* yields an emitter whose context is `undefined` - distinct from the default
		* context, and compared by identity like any other.
		*/
		create(context) {
			return new Emitter$1().in(context);
		}
		/**
		* Dispatches synchronously.
		*/
		event(name, params) {
			debugReporter("debug", name, "Event for '" + name + "' send with parameters ", params);
			store.evaluate(name, params);
			return this;
		}
		/**
		* Queues a dispatch onto the shared 30 ms timer.
		*/
		notify(name, params) {
			debugReporter("debug", name, "Notify for '" + name + "' send with parameters ", params);
			notifyQueue.push({
				name,
				params
			});
			if (!timer) {
				timer = new Timer$1(30, function() {
					runQueue();
					timer.cancel();
					timer = null;
				});
				timer.run();
			}
			return timer;
		}
		/**
		* Dispatches to exactly one handler and returns its value.
		*/
		request(name, params) {
			const returnValue = store.request(name, params);
			debugReporter("debug", name, "Request for '" + name + "' return '" + returnValue + "' for parameters ", params);
			return returnValue;
		}
		/**
		* As `request`, restricted to handlers sharing this emitter's context.
		*/
		ctxRequest(name, params) {
			const ctx = this.context;
			if (ctx === getMqDefault$1()) throw new Error("Request with context is available only on instances with custom context. Current context is default. ");
			const returnValue = store.ctxRequest(ctx, name, params);
			debugReporter("debug", name, "Context request for '" + name + "' return '" + returnValue + "' for parameters ", params);
			return returnValue;
		}
		/**
		* As `request`, but tolerates having no handler.
		*/
		demand(name, params) {
			const returnValue = store.demand(name, params);
			debugReporter("debug", name, "Demand for '" + name + "' return '" + returnValue + "' for parameters ", params);
			return returnValue;
		}
		/**
		* How many handlers listen to an event.
		*/
		watching(name) {
			const count = store.watching(name);
			debugReporter("debug", name, "Watching count status for '" + name + "' return '" + count, []);
			return count;
		}
		/**
		* As `watching`, restricted to this emitter's context.
		*/
		ctxWatching(name) {
			const ctx = this.context;
			if (ctx === getMqDefault$1()) throw new Error("Watching with context is available only on instances with custom context. Current context is default. ");
			const count = store.ctxWatching(ctx, name);
			debugReporter("debug", name, "Context watching count status for '" + name + "' return '" + count, []);
			return count;
		}
		/**
		* Subscribes to a named event, or to a DOM event on an element.
		*/
		subscribe(nameOrElement, nameOrHandler, handlerOrUndefined, paramsOrUndefined, eventOptions) {
			const context = this.context;
			const data = normalizeSubscribeParams(nameOrElement, nameOrHandler, handlerOrUndefined, paramsOrUndefined);
			if (data.element) addEvent(data.element, data.name, createHandler(context, data), eventOptions);
			else store.save(this.context, data.name, data.handler);
			return this;
		}
		/**
		* Stops listening. Given only an event name, drops that event's handlers for
		* this context. With no arguments, drops everything for this context.
		*/
		unsubscribe(nameOrElement, nameOrHandler, handlerOrUndefined) {
			const data = normalizeUnsubscribeParams(nameOrElement, nameOrHandler, handlerOrUndefined);
			if (this.context === getMqDefault$1() && !data.name && !data.handler) console.warn("EventEmitter: You are calling unsubscribe method without parameters. This is unbind all event through application!");
			if (data.element) destroyHandler(this.context, data);
			else {
				store.remove(this.context, data.name, data.handler);
				if (!data.name && !data.handler) destroyHandlersByContext(this.context);
			}
			return this;
		}
		/**
		* Helper for stopping a browser event.
		*/
		interrupt(event, stopProp, cancelDef) {
			if (stopProp) stopPropagation(event);
			if (cancelDef) cancelDefault(event);
		}
		/**
		* Rebinds this emitter to another context. Not allowed on the static one.
		*/
		in(context) {
			if (this.isStatic) throw new Error("EventEmitter: Can not change context on static method. Use EventEmitter.create() with right context.");
			this.context = context;
			return this;
		}
		/**
		* Turns console reporting on or off, process-wide.
		*/
		debugMode(state, filters, simple) {
			debugFilters = filters || [];
			debugMode = state;
			simpleMode = simple;
			if (state) Emitter$1.prototype.getStore = function() {
				return store;
			};
			else Emitter$1.prototype.getStore = void 0;
			console.info("EventEmitter debug mode is set to " + (state ? "on" : "off") + " " + (simple ? "with simple mode" : ""));
		}
	};
	Emitter$1.prototype.version = "2.0.0";
	//#endregion
	//#region src/shared.ts
	/**
	* Rendezvous point so that duplicate copies of this package share one bus.
	*
	* A bundler can easily end up with more than one copy - a library bundling it
	* plus the host app importing it, two versions in a dependency tree, an ESM and
	* a CommonJS build loaded side by side. Each copy would otherwise build its own
	* `Store`, and events sent through one would never reach handlers subscribed
	* through another. Nothing throws; the bus just silently splits in two.
	*
	* The first copy to load publishes its classes and singleton here; every later
	* copy adopts them and leaves its own inert. `Symbol.for` is used so the lookup
	* works across copies without relying on a string property that application
	* code might also touch.
	*/
	var REGISTRY = Symbol.for("@sedlak.r/mq");
	/**
	* Returns the already-published runtime, or publishes and returns this copy's.
	*
	* The factory is only called when this copy is first, so a later copy never
	* pays to construct a `Store` it will not use.
	*/
	function adoptOrPublish(version, create) {
		const host = globalThis;
		const existing = host[REGISTRY];
		if (existing) {
			if (existing.version !== version) console.warn(`EventEmitter: using @sedlak.r/mq ${existing.version}, which loaded first, but this copy is ${version}. Both are present in the bundle; they now share one event bus, and the older API is the one in effect. Deduplicate the dependency to remove this warning.`);
			return existing;
		}
		const runtime = create();
		host[REGISTRY] = runtime;
		return runtime;
	}
	//#endregion
	//#region src/pure.ts
	/**
	* Entry point that does not define the `MQ` / `EventEmitter` globals.
	*
	* It does still use the `Symbol.for` registry in `./shared.js`, because that is
	* the only way duplicate copies of the package can find each other and share a
	* single event bus. Nothing readable by application code is added to
	* `globalThis`; import `@sedlak.r/mq` instead if you want the two globals.
	*/
	var runtime = adoptOrPublish("2.0.0", () => ({
		version: "2.0.0",
		Emitter: Emitter$1,
		Store: Store$1,
		StoreRecord: StoreRecord$1,
		Timer: Timer$1,
		getMqDefault: getMqDefault$1,
		setMqDefault: setMqDefault$1,
		EventEmitter: new Emitter$1(true)
	}));
	/**
	* These resolve to whichever copy of the package loaded first, so two copies in
	* one bundle still dispatch to each other. When this copy is the only one - the
	* normal case - they are exactly its own.
	*/
	var Emitter = runtime.Emitter;
	var Store = runtime.Store;
	runtime.StoreRecord;
	var Timer = runtime.Timer;
	/** The shared, context-less emitter. Cannot be rebound with `in()`. */
	var EventEmitter = runtime.EventEmitter;
	var getMqDefault = runtime.getMqDefault;
	var setMqDefault = runtime.setMqDefault;
	//#endregion
	//#region src/index.ts
	/**
	* Default entry point - a backward-compatible superset of the old bundle.
	*
	* It installs `globalThis.MQ` and `globalThis.EventEmitter` exactly as the
	* concatenated build did, because `main` has always pointed at that bundle and
	* existing consumers depend on the globals. On top of that it re-exports
	* everything as named exports, so new code can import instead.
	*
	* Import `@sedlak.r/mq/pure` for the same API without the globals.
	*/
	if (globalThis.MQ && globalThis.MQ.Emitter !== Emitter) console.warn("MQ already exists on globalThis and was defined by another library; redefining");
	var namespace = {
		Emitter,
		Store,
		Timer
	};
	Object.defineProperty(namespace, "mqDefault", {
		get: getMqDefault,
		set: setMqDefault,
		enumerable: true,
		configurable: true
	});
	globalThis.MQ = namespace;
	if (globalThis.EventEmitter && globalThis.EventEmitter !== EventEmitter) console.warn("EventEmitter already exists on globalThis and was defined by another library; redefining");
	globalThis.EventEmitter = EventEmitter;
	//#endregion
})();
