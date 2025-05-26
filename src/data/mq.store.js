/*global MQ*/
MQ.Store = (function (MQ, p) {
	"use strict";

	/**
	 * Event name create
	 * @param {Object} store
	 * @param {string} name
	 * @returns {Array.<StoreRecord>}
	 */
	function event(store, name) {
		let data = store[name];

		//events not exists
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
	function ctxEvent(store, context, name){
		const data = event(store, name);

		return data.filter(item => item.context === context);
	}

	//noinspection JSValidateJSDoc
	/**
	 * Load based on context
	 * @param {Array.<StoreRecord>} data
	 * @param {Object} params
	 */
	function evaluate(data, params) {
		//iterate
		let i,
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
		let record,
			result,
			length = data.length;

		//error
		if (length === 0) {
			throw new Error("EventEmitter: Can not make request on event that has not handler for '" + name + "'.");
		}
		if (length > 1) {
			throw new Error("EventEmitter: Can not make request on event that has more then one handler. Use EventEmitter.event('" + name + "') instead.");
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
		let record,
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
		let i,
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
		let i,
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
		const normalizedName = normalizeName(name);

		//evaluate
		return request(event(this.store, normalizedName), normalizedName, params);
	};

	/**
	 * Contextual request
	 * @param {Object} ctx
	 * @param {string} name
	 * @param {Object} params
	 * @return {Object}
	 */
	p.ctxRequest = function (ctx, name, params) {
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

	/**
	 * Contextual watching
	 * @param {Object} ctx
	 * @param {string} name
	 * @return {Object}
	 */
	p.ctxWatching = function (ctx, name) {
		//normalize
		name = name.toLowerCase();
		//evaluate
		//noinspection JSUnresolvedVariable
		return watching(ctxEvent(this.store, ctx, name));
	};


	//noinspection JSUnusedGlobalSymbols
	p.version = "1.0";
	return Store;

}(MQ));
