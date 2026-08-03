import { Store, type Context } from "./store.js";
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
    (...args: unknown[]): unknown;
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
/**
 * Emitter.
 */
export declare class Emitter {
    /** Lives on the prototype, not the instance. */
    version: string;
    /** Installed on the prototype by `debugMode(true)` and removed by `false`. */
    getStore?: () => Store;
    context: Context;
    isStatic: boolean;
    constructor(isStatic?: boolean);
    /**
     * Creates a new emitter bound to `context`, sharing the same registry.
     */
    create(context: Context): Emitter;
    /**
     * Dispatches synchronously.
     */
    event(name: string, params?: unknown): this;
    /**
     * Queues a dispatch onto the shared 30 ms timer.
     */
    notify(name: string, params?: unknown): Timer;
    /**
     * Dispatches to exactly one handler and returns its value.
     */
    request(name: string, params?: unknown): unknown;
    /**
     * As `request`, restricted to handlers sharing this emitter's context.
     */
    ctxRequest(name: string, params?: unknown): unknown;
    /**
     * As `request`, but tolerates having no handler.
     */
    demand(name: string, params?: unknown): unknown;
    /**
     * How many handlers listen to an event.
     */
    watching(name: string): number;
    /**
     * As `watching`, restricted to this emitter's context.
     */
    ctxWatching(name: string): number;
    /**
     * Subscribes to a named event, or to a DOM event on an element.
     */
    subscribe(nameOrElement: EventTarget | string, nameOrHandler: string | DecoratedHandler, handlerOrUndefined?: DecoratedHandler, paramsOrUndefined?: unknown[], eventOptions?: boolean | AddEventListenerOptions): this;
    /**
     * Stops listening. With no arguments, drops everything for this context.
     */
    unsubscribe(nameOrElement?: EventTarget | string, nameOrHandler?: string | DecoratedHandler, handlerOrUndefined?: DecoratedHandler): this;
    /**
     * Helper for stopping a browser event.
     */
    interrupt(event: Event, stopProp?: boolean, cancelDef?: boolean): void;
    /**
     * Rebinds this emitter to another context. Not allowed on the static one.
     */
    in(context: Context): this;
    /**
     * Turns console reporting on or off, process-wide.
     */
    debugMode(state: boolean, filters?: string[], simple?: boolean): void;
}
/** Exposed so the global namespace can hand out the shared registry. */
export declare function getSharedStore(): Store;
