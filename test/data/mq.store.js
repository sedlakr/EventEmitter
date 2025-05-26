/*global MQ, describe, it, beforeEach, spyOn*/
describe("The MQ.Store", function () {
	"use strict";

	var count = 0,
		handler;

	beforeEach(function () {
		count = 0;
		handler = {
			counter: function () {
				count++;
				return count;
			}
		};
	});

	it("Create storage record and evaluate, then remove", function () {
		var store = new MQ.Store(),
			context = {};

		spyOn(handler, "counter").and.callThrough();

		store.save(context, "test", handler.counter);

		store.evaluate("test", {param1: "test"});
		expect(count).toBe(1);
		expect(handler.counter).toHaveBeenCalledWith({param1: "test"});

		store.evaluate("test", {param2: "test"});
		expect(count).toBe(2);
		expect(handler.counter).toHaveBeenCalledWith({param2: "test"});

		store.remove(context, "test", handler.counter);
		store.evaluate("test", {param1: "test"});

		expect(count).toBe(2);
	});

	it("Create storage record and request, then remove", function () {
		var store = new MQ.Store(),
			context = {},
			returned;

		spyOn(handler, "counter").and.callThrough();

		store.save(context, "test", handler.counter);

		returned = store.request("test", {param1: "test"});
		expect(count).toBe(1);
		expect(returned).toBe(1);
		expect(handler.counter).toHaveBeenCalledWith({param1: "test"});

		returned = store.request("test", {param2: "test"});
		expect(count).toBe(2);
		expect(returned).toBe(2);
		expect(handler.counter).toHaveBeenCalledWith({param2: "test"});

		store.remove(context, "test", handler.counter);

		expect(function () {
			store.request("test", {param1: "test"});
		}).toThrowError("EventEmitter: Can not make request on event that has not handler for 'test'.");

		expect(count).toBe(2);
	});

	it("record with context", () => {
		const store = new MQ.Store();
		const context1 = {};
		const context2 = {};

		store.save(context1, "test", () => 1);
		store.save(context2, "test", () => 2);

		const res1 = store.ctxRequest(context1, "test", {});
		const res2 = store.ctxRequest(context2, "test", {});

		expect(res1).toBe(1);
		expect(res2).toBe(2);
	});

	it("watching with context", () => {
		const store = new MQ.Store();
		const context1 = {};
		const context2 = {};

		store.save(context1, "test", () => 1);
		store.save(context2, "test", () => 2);
		store.save(context2, "test", () => 3);

		const res1 = store.ctxWatching(context1, "test");
		const res2 = store.ctxWatching(context2, "test");

		expect(res1).toBe(1);
		expect(res2).toBe(2);
	});

});
