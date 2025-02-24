if (globalThis.MQ) {
	console.warn("MQ already exists on globalThis, redefining");
}
globalThis.MQ = {};
;/*global MQ*/
MQ.Timer = (function (MQ, p) {
	"use strict";

	/**
	 * Timer for emitter
	 * @param {number} timeout
	 * @param {function} callback
	 * @constructor
	 */
	function Timer(timeout, callback) {
		/** @type {number}*/
		this.timeout = timeout || 30;
		/** @type {number}*/
		this.timer = 0;
		/** @type {function}*/
		this.callback = callback;
	}

	//shortcut
	p = Timer.prototype;

	/**
	 * Run
	 */
	p.run = function () {
		//already running
		if (this.timer) {
			return;
		}
		//create timer
		this.timer = setTimeout(interval.bind(this, this.callback), this.timeout);
	};

	/**
	 * Cancel
	 */
	p.cancel = function () {
		//already running
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = 0;
		}
	};

	/**
	 * @this {Timer}
	 * @param {Function} handler
	 */
	function interval(handler) {
		//noinspection JSUnresolvedFunction
		this.cancel();
		handler();
	}

	//noinspection JSUnusedGlobalSymbols
	p.version = "1.0";
	return Timer;

}(MQ));;/*global console, MQ*/
MQ.Store = (function (MQ, p) {
	"use strict";

	/**
	 * Event name create
	 * @param {Object} store
	 * @param {string} name
	 * @returns {Array.<StoreRecord>}
	 */
	function event(store, name) {
		var data = store[name];

		//events not exists
		if (!data) {
			data = [];
			store[name] = data;
		}
		return data;
	}

	//noinspection JSValidateJSDoc
	/**
	 * Load based on context
	 * @param {Array.<StoreRecord>} data
	 * @param {Object} params
	 */
	function evaluate(data, params) {
		//iterate
		var i,
			length,
			record;

		//clone data and read length
		data = data.slice(0);
		length = data.length;
		//iterate all
		for (i = 0; i < length; i++) {
			//record
			record = data[i];
			//check if is valid
			if (!record.removed) {
				record.handler.apply(record.context, params ? [params] : []);
			}
		}
	}

	//noinspection JSValidateJSDoc
	/**
	 * Request based on context
	 * @param {Array.<StoreRecord>} data
	 * @param {string} name
	 * @param {Object} params
	 * @return {Object}
	 */
	function request(data, name, params) {
		var record,
			result,
			length = data.length;

		//error
		if (length === 0) {
			throw "EventEmitter: Can not make request on event that has not handler for '" + name + "'.";
		}
		if (length > 1) {
			throw "EventEmitter: Can not make request on event that has more then one handler. Use EventEmitter.event('" + name + "') instead.";
		}
		//get record
		record = data[0];
		//check if is valid
		result = record.handler.apply(record.context, params ? [params] : []);
		//no return
		if (result === undefined) {
			console.warn("EventEmitter: Return from request '" + name + "' is empty! This is might not be valid state.");
		}
		//return
		return result;
	}

	//noinspection JSValidateJSDoc
	/**
	 * Demand based on context
	 * @param {Array.<StoreRecord>} data
	 * @param {string} name
	 * @param {Object} params
	 * @return {Object}
	 */
	function demand(data, name, params) {
		var record,
			result,
			length = data.length;

		//error
		if (length > 1) {
			throw "EventEmitter: Can not make demand on event that has more then one handler. Use EventEmitter.event('" + name + "') instead.";
		}
		//get data if handler exists
		if (length) {
			//get record
			record = data[0];
			//check if is valid
			result = record.handler.apply(record.context, params ? [params] : []);
		}
		//return
		return result;
	}

	//noinspection JSValidateJSDoc
	/**
	 * Demand based on context
	 * @param {Array.<StoreRecord>} data
	 * @return {number}
	 */
	function watching(data) {
		return data.length;
	}

	//noinspection JSValidateJSDoc
	/**
	 * Remove by name
	 * @param {Object.<string, Array.<StoreRecord>>} store
	 * @param {Object} context
	 * @param {string} name
	 * @param {function=} handler
	 */
	function removeByName(store, context, name, handler) {
		var i,
			record,
			canRemove,
			newData = [],
			data = event(store, name),
			length = data.length;

		//clear all, no context set
		if (context === MQ.mqDefault) {
			store[name] = newData;
		} else {
			//iterate all
			for (i = length - 1; i >= 0; i--) {
				//record
				record = data[i];
				//remove right context and right handler
				canRemove = handler && record.context === context && record.handler === handler;
				//remove right context
				canRemove = canRemove || !handler && record.context === context;

				record.removed = canRemove;
				if (canRemove) {
					data.splice(i, 1);
				}
			}
		}
	}

	//noinspection JSValidateJSDoc
	/**
	 * Remove by context
	 * @param {Object.<string, Array.<StoreRecord>>} store
	 * @param {Object} context
	 */
	function removeByContext(store, context) {
		var i,
			key,
			data,
			record,
			length,
			canRemove,
			isDefault = context === MQ.mqDefault;

		for (key in store) {
			if (store.hasOwnProperty(key)) {
				//load data
				data = store[key];
				length = data.length;
				//iterate all
				for (i = length - 1; i >= 0; i--) {
					//record
					record = data[i];
					//remove right context
					canRemove = record.context === context || isDefault;

					record.removed = canRemove;
					if (canRemove) {
						data.splice(i, 1);
					}
				}
			}
		}
	}

	//noinspection JSValidateJSDoc
	/**
	 * Remove
	 * @param {Object.<string, Array.<StoreRecord>>} store
	 * @param {Object} context
	 * @param {string=} name
	 * @param {function=} handler
	 */
	function remove(store, context, name, handler) {
		//remove by name
		if (name !== undefined && name !== null) {
			removeByName(store, context, name, handler);
		} else {
			removeByContext(store, context);
		}
	}

	/**
	 * Store record
	 * @param {Object} context
	 * @param {Function} handler
	 * @constructor
	 */
	function StoreRecord(context, handler) {
		/** @type {Object}*/
		this.context = context;
		/** @type {Function}*/
		this.handler = handler;
		/** @type {boolean}*/
		this.removed = false;
	}

	/**
	 * Store for emitter
	 * @constructor
	 */
	function Store() {
		//noinspection JSValidateJSDoc
		/** @type {Object.<string, Array.<StoreRecord>>}*/
		this.store = {};
	}

	//shortcut
	p = Store.prototype;

	/**
	 * Save
	 * @param {Object} context
	 * @param {string} name
	 * @param {function} handler
	 */
	p.save = function (context, name, handler) {
		//normalize
		name = name.toLowerCase();
		//get store
		//noinspection JSValidateTypes,JSUnresolvedVariable
		event(this.store, name).push(new StoreRecord(context, handler));
	};

	/**
	 * Remove
	 * @param {Object} context
	 * @param {string|null=} name
	 * @param {function=} handler
	 */
	p.remove = function (context, name, handler) {
		//normalize
		name = name ? name.toLowerCase() : name;
		//get store
		//noinspection JSUnresolvedVariable
		remove(this.store, context, name, handler);
	};

	/**
	 * Evaluate
	 * @param {string} name
	 * @param {Object} params
	 */
	p.evaluate = function (name, params) {
		//normalize
		name = name.toLowerCase();
		//evaluate
		//noinspection JSUnresolvedVariable
		evaluate(event(this.store, name), params);
	};

	/**
	 * Request
	 * @param {string} name
	 * @param {Object} params
	 * @return {Object}
	 */
	p.request = function (name, params) {
		//normalize
		name = name.toLowerCase();
		//evaluate
		//noinspection JSUnresolvedVariable
		return request(event(this.store, name), name, params);
	};

	/**
	 * Demand
	 * @param {string} name
	 * @param {Object} params
	 * @return {Object}
	 */
	p.demand = function (name, params) {
		//normalize
		name = name.toLowerCase();
		//evaluate
		//noinspection JSUnresolvedVariable
		return demand(event(this.store, name), name, params);
	};

	/**
	 * Watching
	 * @param {string} name
	 * @return {number}
	 */
	p.watching = function (name) {
		//normalize
		name = name.toLowerCase();
		//evaluate
		//noinspection JSUnresolvedVariable
		return watching(event(this.store, name));
	};

	//noinspection JSUnusedGlobalSymbols
	p.version = "1.0";
	return Store;

}(MQ));;/*global console, MQ*/
MQ.Emitter = (function (MQ, p) {
	"use strict";

	var timer,
		/** @type {Array.<NotifyQueueItem>}*/
		notifyQueue = [],
		debugFilters = [],
		debugMode = false,
		simpleMode = false,
		store = new MQ.Store();

	/**
	 * @typedef {Object} NotifyQueueItem
	 * @property {string} name
	 * @property {Object} params
	 */

	//set data
	/**
	 * @type {Window}
	 * @public
	 */
	MQ.mqDefault = globalThis;

	/**
	 * Add event
	 * @param {Window|HTMLElement|HTMLDocument} element
	 * @param {string} eventType
	 * @param {function} handler
	 * @param {object=} eventOptions
	 */
	function addEvent(element, eventType, handler, eventOptions) {
		//tripleclick
		if (eventType === "tripleclick") {
			addTripleClick(element, handler);
			return;
		}

		// noinspection JSUnresolvedVariable
		/**
		 * Done
		 * @param {Event} e
		 */
		handler.eventDoneRuntime = handler.eventDoneRuntime || function (e) {
			handler(globalThis.event || e);
		};

		//noinspection JSUnresolvedVariable
		element.addEventListener(eventType, handler.eventDoneRuntime, eventOptions ?? false);
		//for firefox
		if (eventType === "mousewheel") {
			//noinspection JSUnresolvedVariable
			addEvent(element, "DOMMouseScroll", handler.eventDoneRuntime);
		}
	}

	/**
	 * Remove handler
	 * @param {Window|HTMLElement} element
	 * @param {string|null} eventType
	 * @param {function} handler
	 */
	function removeEvent(element, eventType, handler) {
		//tripleclick
		if (eventType === "tripleclick") {
			removeTripleClick(element, handler);
			return;
		}
		//noinspection JSUnresolvedVariable
		element.removeEventListener(eventType, handler.eventDoneRuntime);
		//for firefox
		if (eventType === "mousewheel") {
			//noinspection JSUnresolvedVariable
			removeEvent(element, "DOMMouseScroll", handler.eventDoneRuntime);
		}
		//remove data
		cleanHandlerData(handler);
	}

	/**
	 * Add triple click
	 * @param {Element} el
	 * @param {Function} handler
	 */
	function addTripleClick(el, handler) {
		var clickCount = 0,
			clickStart = 0;

		/**
		 * Triple click dblclick handler
		 * @param {Event} event
		 */
		handler.tripleDblClickHandler = function (event) {
			if (!document.body.addEventListener) {
				//noinspection JSUnresolvedFunction
				handler.tripleClickHandler(event || globalThis.event);
			}
		};
		/**
		 * Triple click click handler
		 * @param {Event} event
		 */
		handler.tripleClickHandler = function (event) {
			//event convert
			event = event || globalThis.event;
			//check date
			if (clickStart > (new Date()).getTime() - 400) {
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
		//noinspection JSUnresolvedVariable
		addEvent(el, "click", handler.tripleClickHandler);
		//noinspection JSUnresolvedVariable
		addEvent(el, "dblclick", handler.tripleDblClickHandler);
	}

	/**
	 * Remove triple click
	 * @param {Element} el
	 * @param {Function} handler
	 */
	function removeTripleClick(el, handler) {
		//noinspection JSUnresolvedVariable
		removeEvent(el, "click", handler.tripleClickHandler);
		//noinspection JSUnresolvedVariable
		removeEvent(el, "dblclick", handler.tripleDblClickHandler);
		//remove data
		cleanTripleClickHandlerData(handler);
		cleanHandlerData(handler);
	}

	/**
	 * @param {function} handler
	 */
	function cleanHandlerData(handler) {
		//remove data
		delete handler.element;
		delete handler.type;
		delete handler.context;
	}

	/**
	 * @param {function} handler
	 */
	function cleanTripleClickHandlerData(handler) {
		//remove data
		delete handler.tripleClickHandler;
		delete handler.tripleDblClickHandler;
	}

	/**
	 * Stop propagation
	 * @param {Event} e
	 */
	function stopPropagation(e) {
		e.cancelBubble = true;
		if (e.stopPropagation !== undefined) {
			e.stopPropagation();
		}
	}

	/**
	 * Cancel default
	 * @param {Event} e
	 * @returns {boolean}
	 */
	function cancelDefault(e) {
		var evt = e ? e : globalThis.event;

		if (evt.preventDefault) {
			evt.preventDefault();
		}
		evt.returnValue = false;
		return false;
	}

	/**
	 * Normalize params
	 * @param {Document|Window|Element|string} nameOrElement
	 * @param {string|function} nameOrHandler
	 * @param {function} handler
	 * @param {Array.<Object>=} paramsOrUndefined
	 * @returns {{element: Element, name: string, handler: function, params: Array.<Object>}}
	 */
	function normalizeSubscribeParams(nameOrElement, nameOrHandler, handler, paramsOrUndefined) {
		var isElement,
			isDocument,
			isWindow;

		//type 1
		if (typeof nameOrElement === "string" && typeof nameOrHandler === "function") {
			//return
			return {
				element: null,
				name: nameOrElement,
				handler: nameOrHandler,
				params: paramsOrUndefined || []
			};
		}

		//type 2
		isElement = nameOrElement.nodeType && nameOrElement.nodeType === 1;
		isDocument = nameOrElement === document;
		isWindow = nameOrElement === globalThis;
		//check
		if ((isElement || isWindow || isDocument) && typeof nameOrHandler === "string" && typeof handler === "function") {
			//return
			return {
				element: nameOrElement,
				name: nameOrHandler,
				handler: handler,
				params: paramsOrUndefined || []
			};
		}

		//error
		throw "EventEmitter: Incorrect parameters given into function subscribe() or unsubscribe().";
	}

	/**
	 * Normalize params
	 * @param {Document|Window|Element|string} nameOrElement
	 * @param {string|function} nameOrHandler
	 * @param {function} handler
	 * @returns {{element: Element, name: string, handler: function}|null}
	 */
	function normalizeUnsubscribeParams(nameOrElement, nameOrHandler, handler) {
		var isElement,
			isDocument,
			isWindow;

		//type 1
		if (nameOrElement === undefined || nameOrHandler === undefined) {
			//return
			//noinspection JSValidateTypes
			return {
				element: null,
				name: null,
				handler: null
			};
		}

		//type 2
		if (typeof nameOrElement === "string" && typeof nameOrHandler === "function") {
			//return
			return {
				element: null,
				name: nameOrElement,
				handler: nameOrHandler
			};
		}

		//type 3
		isElement = nameOrElement.nodeType && nameOrElement.nodeType === 1;
		isDocument = nameOrElement === document;
		isWindow = nameOrElement === globalThis;
		//check
		if ((isElement || isWindow || isDocument) && typeof nameOrHandler === "string" && typeof handler === "function") {
			//return
			return {
				element: nameOrElement,
				name: nameOrHandler,
				handler: handler
			};
		}

		return null;
	}

	/**
	 * Debug mode reporter
	 * @param {string} type
	 * @param {string} eventName
	 * @param {string} message
	 * @param {object} data
	 */
	function debugReporter(type, eventName, message, data) {
		//do not debug if not right mode
		if (!console || !debugMode) {
			return;
		}
		//ignore all events in filter
		if (debugFilters.indexOf(eventName) >= 0) {
			return;
		}
		//get display fnc
		if (console[type]) {
			console[type]("EventEmitter: (" + (new Date()).toLocaleTimeString() + ") " + message, simpleMode ? "" : data);
		} else {
			console.info("EventEmitter: (" + (new Date()).toLocaleTimeString() + ") " + message, simpleMode ? "" : data);
		}
	}

	/**
	 * Run queue
	 */
	function runQueue() {
		var queue;

		//run
		queue = /** @type {NotifyQueueItem}*/notifyQueue.shift();
		while (queue) {
			store.evaluate(queue.name, queue.params);
			queue = /** @type {NotifyQueueItem}*/notifyQueue.shift();
		}
	}

	//PUBLIC INTERFACE

	/**
	 * Emitter
	 * @param {boolean} isStatic
	 * @constructor
	 */
	function Emitter(isStatic) {
		/** @type {Object}*/
		this.context = MQ.mqDefault;
		/** @type {boolean}*/
		this.isStatic = isStatic || false;
	}

	//shortcut
	p = Emitter.prototype;

	/**
	 * Create new
	 * @param {Object} context
	 * @returns {Emitter}
	 */
	p.create = function (context) {
		return new MQ.Emitter().in(context);
	};

	/**
	 * Event
	 * @param {string} name
	 * @param {Object} params
	 * @returns {Emitter}
	 */
	p.event = function (name, params) {
		debugReporter("debug", name, "Event for '" + name + "' send with parameters ", params);
		//evaluate
		store.evaluate(name, params);
		//return self
		return this;
	};

	/**
	 * Notify
	 * @param {string} name
	 * @param {Object} params
	 * @returns {MQ.Timer}
	 */
	p.notify = function (name, params) {
		var queue = /** @type {NotifyQueueItem}*/{};

		//reporter
		debugReporter("debug", name, "Notify for '" + name + "' send with parameters ", params);
		//name, params
		queue.name = name;
		queue.params = params;
		//save queue
		notifyQueue.push(queue);
		//timer not exists, run it
		if (!timer) {
			//timer
			timer = new MQ.Timer(30, function () {
				runQueue();
				timer.cancel();
				timer = null;
			});
			//run
			timer.run();
		}
		//return timer
		return /** @type {MQ.Timer}*/timer;
	};

	/**
	 * Request
	 * @param {string} name
	 * @param {Object} params
	 * @return {Object}
	 */
	p.request = function (name, params) {
		//evaluate and return response
		var returnValue = store.request(name, params);

		//reporter
		debugReporter("debug", name, "Request for '" + name + "' return '" + returnValue + "' for parameters ", params);
		//return data
		return returnValue;
	};

	/**
	 * Demand
	 * @param {string} name
	 * @param {Object} params
	 * @return {Object}
	 */
	p.demand = function (name, params) {
		//evaluate and return response
		var returnValue = store.demand(name, params);

		//reporter
		debugReporter("debug", name, "Demand for '" + name + "' return '" + returnValue + "' for parameters ", params);
		//return data
		return returnValue;
	};

	/**
	 * Watching
	 * @param {string} name
	 * @return {number}
	 */
	p.watching = function (name) {
		//evaluate and return response
		var count = store.watching(name);

		//reporter
		debugReporter("debug", name, "Watching count status for '" + name + "' return '" + count, []);
		//return data
		return count;
	};

	/**
	 * Create handler
	 * @param {*} context
	 * @param {{element: Element, name: string, handler: function, params: Array.<Object>}} data
	 * @return {function}
	 */
	function createHandler(context, data) {
		var handlers;

		//create name by event name
		handlers = data.handler.handlers = data.handler.handlers || [];

		/**
		 * Handler
		 * @param {Event} event
		 */
		function handler(event) {
			data.handler.apply(context, [[event].concat(data.params)]);
		}
		handler.element = data.element;
		handler.type = data.name;
		handler.context = context;
		//add
		handlers.push(handler);

		return handler;
	}

	/**
	 * Destroy handler
	 * @param {Object} context
	 * @param {{element: Element, name: string, handler: function}|null} data
	 */
	function destroyHandler(context, data) {
		var i,
			handlerType,
			handlerContext,
			currentHandler,
			handlerElement,
			newHandlers = [],
			currentType = data.name,
			currentElement = data.element,
			handlers = data.handler.handlers || [];

		//iterate all
		for (i = handlers.length - 1; i >= 0; i--) {
			//load handler
			currentHandler = handlers[i];
			handlerElement = currentHandler.element;
			handlerType = currentHandler.type;
			handlerContext = currentHandler.context;
			//for this element
			if (handlerElement === currentElement && currentType === handlerType && handlerContext === context) {
				//remove event
				removeEvent(data.element, data.name, currentHandler);

			} else {
				newHandlers.push(currentHandler);
			}
		}

		//save new handlers
		data.handler.handlers = newHandlers;
	}

	/**
	 * Subscribe
	 * @param {Element|string} nameOrElement
	 * @param {string|function} nameOrHandler
	 * @param {function=} handlerOrUndefined
	 * @param {Array.<Object>=} paramsOrUndefined
	 * @param {object=} eventOptions
	 * @returns {Emitter}
	 */
	p.subscribe = function (nameOrElement, nameOrHandler, handlerOrUndefined, paramsOrUndefined, eventOptions) {
		var context = this.context,
			data = normalizeSubscribeParams(nameOrElement, nameOrHandler, handlerOrUndefined, paramsOrUndefined);

		//for element
		if (data.element) {
			//noinspection JSUnresolvedVariable
			addEvent(data.element, data.name, createHandler(context, data), eventOptions);
		//no element event
		} else {
			//save to storage
			store.save(this.context, data.name, data.handler);
		}
		//return self
		return this;
	};

	/**
	 * Unsubscribe
	 * @param {Element|string} nameOrElement
	 * @param {string|function} nameOrHandler
	 * @param {function=} handlerOrUndefined
	 * @returns {Emitter}
	 */
	p.unsubscribe = function (nameOrElement, nameOrHandler, handlerOrUndefined) {
		var data = normalizeUnsubscribeParams(nameOrElement, nameOrHandler, handlerOrUndefined);

		//this is weird
		if (this.context === MQ.mqDefault && !data.name && !data.handler) {
			console.warn("EventEmitter: You are calling unsubscribe method without parameters. This is unbind all event through application!");
		}

		if (data.element) {
			//destroy handler
			destroyHandler(this.context, data);

		//no element event
		} else {
			//remove from storage
			store.remove(this.context, data.name, data.handler);
		}
		//return self
		return this;
	};

	/**
	 * Interrupt
	 * @param {Event} event
	 * @param {boolean} stopProp Stop propagation
	 * @param {boolean} cancelDef Cancel default
	 */
	p.interrupt = function (event, stopProp, cancelDef) {
		if (stopProp) {
			stopPropagation(event);
		}
		if (cancelDef) {
			cancelDefault(event);
		}
	};

	/**
	 * In
	 * @param {Object} context
	 * @returns {Emitter}
	 */
	p.in = function (context) {
		//noinspection JSUnresolvedVariable
		var isStatic = this.isStatic;

		//static
		if (isStatic) {
			throw "EventEmitter: Can not change context on static method. Use EventEmitter.create() with right context.";
		}
		//set new context
		this.context = context;
		//return it
		return this;
	};

	/**
	 * Set debug mode on / off
	 * @param {boolean} state
	 * @param {Array.<string>=} filters
	 * @param {boolean=} simple
	 */
	p.debugMode = function (state, filters, simple) {
		debugFilters = filters || [];
		debugMode = state;
		simpleMode = simple;
		// store getter when debug mode is on
		if (state) {
			p.getStore = function () {
				return store;
			};
		} else {
			p.getStore = undefined;
		}
		console.info("EventEmitter debug mode is set to " + (state ? "on" : "off") + " " + (simple ? "with simple mode" : ""));
	};

	//noinspection JSUnusedGlobalSymbols
	p.version = "1.0";
	//return event
	return Emitter;

}(MQ));
;/*global MQ*/
//EventEmitter create
if (globalThis.EventEmitter) {
	console.warn(" EventEmitter already exists on globalThis, redefining");
}
globalThis.EventEmitter = new MQ.Emitter(true); //eslint-disable-line
