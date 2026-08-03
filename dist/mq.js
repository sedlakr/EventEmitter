/*! @sedlak.r/mq@1.5.0 */
(function() {
	//#region src/mq.js
	if (globalThis.MQ) console.warn("MQ already exists on globalThis, redefining");
	globalThis.MQ = {};
	//#endregion
	//#region src/data/mq.timer.js
	MQ.Timer = function(MQ, p) {
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
		p = Timer.prototype;
		/**
		* Run
		*/
		p.run = function() {
			if (this.timer) return;
			this.timer = setTimeout(interval.bind(this, this.callback), this.timeout);
		};
		/**
		* Cancel
		*/
		p.cancel = function() {
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
			this.cancel();
			handler();
		}
		p.version = "1.0";
		return Timer;
	}(MQ);
	//#endregion
	//#region src/data/mq.store.js
	MQ.Store = function(MQ, p) {
		"use strict";
		/**
		* Event name create
		* @param {Object} store
		* @param {string} name
		* @returns {Array.<StoreRecord>}
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
		* Context event name create
		* @param {Object} store
		* @param {Object} context
		* @param {string} name
		* @returns {Array.<StoreRecord>}
		*/
		function ctxEvent(store, context, name) {
			return event(store, name).filter((item) => item.context === context);
		}
		/**
		* Load based on context
		* @param {Array.<StoreRecord>} data
		* @param {Object} params
		*/
		function evaluate(data, params) {
			let i, length, record;
			data = data.slice(0);
			length = data.length;
			for (i = 0; i < length; i++) {
				record = data[i];
				if (!record.removed) record.handler.apply(record.context, params ? [params] : []);
			}
		}
		/**
		* Request based on context
		* @param {Array.<StoreRecord>} data
		* @param {string} name
		* @param {Object} params
		* @return {Object}
		*/
		function request(data, name, params) {
			let record, result, length = data.length;
			if (length === 0) throw new Error("EventEmitter: Can not make request on event that has not handler for '" + name + "'.");
			if (length > 1) throw new Error("EventEmitter: Can not make request on event that has more then one handler. Use EventEmitter.event('" + name + "') instead.");
			record = data[0];
			result = record.handler.apply(record.context, params ? [params] : []);
			if (result === void 0) console.warn("EventEmitter: Return from request '" + name + "' is empty! This is might not be valid state.");
			return result;
		}
		/**
		* Demand based on context
		* @param {Array.<StoreRecord>} data
		* @param {string} name
		* @param {Object} params
		* @return {Object}
		*/
		function demand(data, name, params) {
			let record, result, length = data.length;
			if (length > 1) throw "EventEmitter: Can not make demand on event that has more then one handler. Use EventEmitter.event('" + name + "') instead.";
			if (length) {
				record = data[0];
				result = record.handler.apply(record.context, params ? [params] : []);
			}
			return result;
		}
		/**
		* Demand based on context
		* @param {Array.<StoreRecord>} data
		* @return {number}
		*/
		function watching(data) {
			return data.length;
		}
		/**
		* Remove by name
		* @param {Object.<string, Array.<StoreRecord>>} store
		* @param {Object} context
		* @param {string} name
		* @param {function=} handler
		*/
		function removeByName(store, context, name, handler) {
			let i, record, canRemove, newData = [], data = event(store, name), length = data.length;
			if (context === MQ.mqDefault) store[name] = newData;
			else for (i = length - 1; i >= 0; i--) {
				record = data[i];
				canRemove = handler && record.context === context && record.handler === handler;
				canRemove = canRemove || !handler && record.context === context;
				record.removed = canRemove;
				if (canRemove) data.splice(i, 1);
			}
		}
		/**
		* Remove by context
		* @param {Object.<string, Array.<StoreRecord>>} store
		* @param {Object} context
		*/
		function removeByContext(store, context) {
			let i, key, data, record, length, canRemove, isDefault = context === MQ.mqDefault;
			for (key in store) if (store.hasOwnProperty(key)) {
				data = store[key];
				length = data.length;
				for (i = length - 1; i >= 0; i--) {
					record = data[i];
					canRemove = record.context === context || isDefault;
					record.removed = canRemove;
					if (canRemove) data.splice(i, 1);
				}
			}
		}
		/**
		* Remove
		* @param {Object.<string, Array.<StoreRecord>>} store
		* @param {Object} context
		* @param {string=} name
		* @param {function=} handler
		*/
		function remove(store, context, name, handler) {
			if (name !== void 0 && name !== null) removeByName(store, context, name, handler);
			else removeByContext(store, context);
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
			/** @type {Object.<string, Array.<StoreRecord>>}*/
			this.store = {};
		}
		p = Store.prototype;
		/**
		* Save
		* @param {Object} context
		* @param {string} name
		* @param {function} handler
		*/
		p.save = function(context, name, handler) {
			name = name.toLowerCase();
			event(this.store, name).push(new StoreRecord(context, handler));
		};
		/**
		* Remove
		* @param {Object} context
		* @param {string|null=} name
		* @param {function=} handler
		*/
		p.remove = function(context, name, handler) {
			name = name ? name.toLowerCase() : name;
			remove(this.store, context, name, handler);
		};
		/**
		* Evaluate
		* @param {string} name
		* @param {Object} params
		*/
		p.evaluate = function(name, params) {
			name = name.toLowerCase();
			evaluate(event(this.store, name), params);
		};
		/**
		* Request
		* @param {string} name
		* @param {Object} params
		* @return {Object}
		*/
		p.request = function(name, params) {
			const normalizedName = normalizeName(name);
			return request(event(this.store, normalizedName), normalizedName, params);
		};
		/**
		* Contextual request
		* @param {Object} ctx
		* @param {string} name
		* @param {Object} params
		* @return {Object}
		*/
		p.ctxRequest = function(ctx, name, params) {
			const normalizedName = normalizeName(name);
			return request(ctxEvent(this.store, ctx, normalizedName), normalizedName, params);
		};
		/**
		* Normalize evt name
		* @param {string} name
		* @returns {string}
		*/
		function normalizeName(name) {
			return name.toLowerCase();
		}
		/**
		* Demand
		* @param {string} name
		* @param {Object} params
		* @return {Object}
		*/
		p.demand = function(name, params) {
			name = name.toLowerCase();
			return demand(event(this.store, name), name, params);
		};
		/**
		* Watching
		* @param {string} name
		* @return {number}
		*/
		p.watching = function(name) {
			name = name.toLowerCase();
			return watching(event(this.store, name));
		};
		/**
		* Contextual watching
		* @param {Object} ctx
		* @param {string} name
		* @return {Object}
		*/
		p.ctxWatching = function(ctx, name) {
			name = name.toLowerCase();
			return watching(ctxEvent(this.store, ctx, name));
		};
		p.version = "1.0";
		return Store;
	}(MQ);
	//#endregion
	//#region src/data/mq.emitter.js
	MQ.Emitter = function(MQ, p) {
		"use strict";
		let timer, notifyQueue = [], debugFilters = [], debugMode = false, simpleMode = false, store = new MQ.Store();
		/**
		* @typedef {Object} NotifyQueueItem
		* @property {string} name
		* @property {Object} params
		*/
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
			if (eventType === "tripleclick") {
				addTripleClick(element, handler);
				return;
			}
			/**
			* Done
			* @param {Event} e
			*/
			handler.eventDoneRuntime = handler.eventDoneRuntime || function(e) {
				handler(globalThis.event || e);
			};
			element.addEventListener(eventType, handler.eventDoneRuntime, eventOptions ?? false);
			if (eventType === "mousewheel") addEvent(element, "DOMMouseScroll", handler.eventDoneRuntime);
		}
		/**
		* Remove handler
		* @param {Window|HTMLElement} element
		* @param {string|null} eventType
		* @param {function} handler
		*/
		function removeEvent(element, eventType, handler) {
			if (eventType === "tripleclick") {
				removeTripleClick(element, handler);
				return;
			}
			element.removeEventListener(eventType, handler.eventDoneRuntime);
			if (eventType === "mousewheel") removeEvent(element, "DOMMouseScroll", handler.eventDoneRuntime);
			cleanHandlerData(handler);
		}
		/**
		* Add triple click
		* @param {Element} el
		* @param {Function} handler
		*/
		function addTripleClick(el, handler) {
			let clickCount = 0, clickStart = 0;
			/**
			* Triple click dblclick handler
			* @param {Event} event
			*/
			handler.tripleDblClickHandler = function(event) {
				if (!document.body.addEventListener) handler.tripleClickHandler(event || globalThis.event);
			};
			/**
			* Triple click click handler
			* @param {Event} event
			*/
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
		/**
		* Remove triple click
		* @param {Element} el
		* @param {Function} handler
		*/
		function removeTripleClick(el, handler) {
			removeEvent(el, "click", handler.tripleClickHandler);
			removeEvent(el, "dblclick", handler.tripleDblClickHandler);
			cleanTripleClickHandlerData(handler);
			cleanHandlerData(handler);
		}
		/**
		* @param {function} handler
		*/
		function cleanHandlerData(handler) {
			delete handler.element;
			delete handler.type;
			delete handler.context;
		}
		/**
		* @param {function} handler
		*/
		function cleanTripleClickHandlerData(handler) {
			delete handler.tripleClickHandler;
			delete handler.tripleDblClickHandler;
		}
		/**
		* Stop propagation
		* @param {Event} e
		*/
		function stopPropagation(e) {
			e.cancelBubble = true;
			if (e.stopPropagation !== void 0) e.stopPropagation();
		}
		/**
		* Cancel default
		* @param {Event} e
		* @returns {boolean}
		*/
		function cancelDefault(e) {
			const evt = e ? e : globalThis.event;
			if (evt.preventDefault) evt.preventDefault();
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
			if (typeof nameOrElement === "string" && typeof nameOrHandler === "function") return {
				element: null,
				name: nameOrElement,
				handler: nameOrHandler,
				params: paramsOrUndefined || []
			};
			if ((nameOrElement.nodeType && nameOrElement.nodeType === 1 || nameOrElement === globalThis || nameOrElement === document) && typeof nameOrHandler === "string" && typeof handler === "function") return {
				element: nameOrElement,
				name: nameOrHandler,
				handler,
				params: paramsOrUndefined || []
			};
			throw new Error("EventEmitter: Incorrect parameters given into function subscribe() or unsubscribe().");
		}
		/**
		* Normalize params
		* @param {Document|Window|Element|string} nameOrElement
		* @param {string|function} nameOrHandler
		* @param {function} handler
		* @returns {{element: Element, name: string, handler: function}|null}
		*/
		function normalizeUnsubscribeParams(nameOrElement, nameOrHandler, handler) {
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
			if ((nameOrElement.nodeType && nameOrElement.nodeType === 1 || nameOrElement === globalThis || nameOrElement === document) && typeof nameOrHandler === "string" && typeof handler === "function") return {
				element: nameOrElement,
				name: nameOrHandler,
				handler
			};
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
			if (!console || !debugMode) return;
			if (debugFilters.indexOf(eventName) >= 0) return;
			if (console[type]) console[type]("EventEmitter: (" + (/* @__PURE__ */ new Date()).toLocaleTimeString() + ") " + message, simpleMode ? "" : data);
			else console.info("EventEmitter: (" + (/* @__PURE__ */ new Date()).toLocaleTimeString() + ") " + message, simpleMode ? "" : data);
		}
		/**
		* Run queue
		*/
		function runQueue() {
			let queue = notifyQueue.shift();
			while (queue) {
				store.evaluate(queue.name, queue.params);
				queue = notifyQueue.shift();
			}
		}
		/**
		* Emitter
		* @param {boolean=} isStatic
		* @constructor
		*/
		function Emitter(isStatic) {
			/** @type {Object}*/
			this.context = MQ.mqDefault;
			/** @type {boolean}*/
			this.isStatic = isStatic || false;
		}
		p = Emitter.prototype;
		/**
		* Create new
		* @param {Object} context
		* @returns {Emitter}
		*/
		p.create = function(context) {
			return new MQ.Emitter().in(context);
		};
		/**
		* Event
		* @param {string} name
		* @param {Object} params
		* @returns {Emitter}
		*/
		p.event = function(name, params) {
			debugReporter("debug", name, "Event for '" + name + "' send with parameters ", params);
			store.evaluate(name, params);
			return this;
		};
		/**
		* Notify
		* @param {string} name
		* @param {Object} params
		* @returns {MQ.Timer}
		*/
		p.notify = function(name, params) {
			let queue = (/** @type {NotifyQueueItem}*/ {});
			debugReporter("debug", name, "Notify for '" + name + "' send with parameters ", params);
			queue.name = name;
			queue.params = params;
			notifyQueue.push(queue);
			if (!timer) {
				timer = new MQ.Timer(30, function() {
					runQueue();
					timer.cancel();
					timer = null;
				});
				timer.run();
			}
			return timer;
		};
		/**
		* Request
		* @param {string} name
		* @param {Object} params
		* @return {Object}
		*/
		p.request = function(name, params) {
			let returnValue = store.request(name, params);
			debugReporter("debug", name, "Request for '" + name + "' return '" + returnValue + "' for parameters ", params);
			return returnValue;
		};
		/**
		* Request
		* @param {string} name
		* @param {Object} params
		* @return {Object}
		*/
		p.ctxRequest = function(name, params) {
			const ctx = this.context;
			if (ctx === MQ.mqDefault) throw new Error("Request with context is available only on instances with custom context. Current context is default. ");
			let returnValue = store.ctxRequest(ctx, name, params);
			debugReporter("debug", name, "Context request for '" + name + "' return '" + returnValue + "' for parameters ", params);
			return returnValue;
		};
		/**
		* Demand
		* @param {string} name
		* @param {Object} params
		* @return {Object}
		*/
		p.demand = function(name, params) {
			let returnValue = store.demand(name, params);
			debugReporter("debug", name, "Demand for '" + name + "' return '" + returnValue + "' for parameters ", params);
			return returnValue;
		};
		/**
		* Watching
		* @param {string} name
		* @return {number}
		*/
		p.watching = function(name) {
			let count = store.watching(name);
			debugReporter("debug", name, "Watching count status for '" + name + "' return '" + count, []);
			return count;
		};
		/**
		* Watching with context
		* @param {string} name
		* @return {number}
		*/
		p.ctxWatching = function(name) {
			const ctx = this.context;
			if (ctx === MQ.mqDefault) throw new Error("Watching with context is available only on instances with custom context. Current context is default. ");
			let count = store.ctxWatching(ctx, name);
			debugReporter("debug", name, "Context watching count status for '" + name + "' return '" + count, []);
			return count;
		};
		/**
		* Create handler
		* @param {*} context
		* @param {{element: Element, name: string, handler: function, params: Array.<Object>}} data
		* @return {function}
		*/
		function createHandler(context, data) {
			let handlers = data.handler.handlers = data.handler.handlers || [];
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
			handlers.push(handler);
			return handler;
		}
		/**
		* Destroy handler
		* @param {Object} context
		* @param {{element: Element, name: string, handler: function}|null} data
		*/
		function destroyHandler(context, data) {
			let i, handlerType, handlerContext, currentHandler, handlerElement, newHandlers = [], currentType = data.name, currentElement = data.element, handlers = data.handler.handlers || [];
			for (i = handlers.length - 1; i >= 0; i--) {
				currentHandler = handlers[i];
				handlerElement = currentHandler.element;
				handlerType = currentHandler.type;
				handlerContext = currentHandler.context;
				if (handlerElement === currentElement && currentType === handlerType && handlerContext === context) removeEvent(data.element, data.name, currentHandler);
				else newHandlers.push(currentHandler);
			}
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
		p.subscribe = function(nameOrElement, nameOrHandler, handlerOrUndefined, paramsOrUndefined, eventOptions) {
			let context = this.context, data = normalizeSubscribeParams(nameOrElement, nameOrHandler, handlerOrUndefined, paramsOrUndefined);
			if (data.element) addEvent(data.element, data.name, createHandler(context, data), eventOptions);
			else store.save(this.context, data.name, data.handler);
			return this;
		};
		/**
		* Unsubscribe
		* @param {Element|string} nameOrElement
		* @param {string|function} nameOrHandler
		* @param {function=} handlerOrUndefined
		* @returns {Emitter}
		*/
		p.unsubscribe = function(nameOrElement, nameOrHandler, handlerOrUndefined) {
			let data = normalizeUnsubscribeParams(nameOrElement, nameOrHandler, handlerOrUndefined);
			if (this.context === MQ.mqDefault && !data.name && !data.handler) console.warn("EventEmitter: You are calling unsubscribe method without parameters. This is unbind all event through application!");
			if (data.element) destroyHandler(this.context, data);
			else store.remove(this.context, data.name, data.handler);
			return this;
		};
		/**
		* Interrupt
		* @param {Event} event
		* @param {boolean} stopProp Stop propagation
		* @param {boolean} cancelDef Cancel default
		*/
		p.interrupt = function(event, stopProp, cancelDef) {
			if (stopProp) stopPropagation(event);
			if (cancelDef) cancelDefault(event);
		};
		/**
		* In
		* @param {Object} context
		* @returns {Emitter}
		*/
		p.in = function(context) {
			if (this.isStatic) throw new Error("EventEmitter: Can not change context on static method. Use EventEmitter.create() with right context.");
			this.context = context;
			return this;
		};
		/**
		* Set debug mode on / off
		* @param {boolean} state
		* @param {Array.<string>=} filters
		* @param {boolean=} simple
		*/
		p.debugMode = function(state, filters, simple) {
			debugFilters = filters || [];
			debugMode = state;
			simpleMode = simple;
			if (state) p.getStore = function() {
				return store;
			};
			else p.getStore = void 0;
			console.info("EventEmitter debug mode is set to " + (state ? "on" : "off") + " " + (simple ? "with simple mode" : ""));
		};
		p.version = "1.0";
		return Emitter;
	}(MQ);
	//#endregion
	//#region src/mq.static.js
	if (globalThis.EventEmitter) console.warn(" EventEmitter already exists on globalThis, redefining");
	globalThis.EventEmitter = new MQ.Emitter(true);
	//#endregion
})();
