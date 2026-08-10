/**
 * Timer for emitter.
 *
 * Wraps a single `setTimeout`. `notify()` batches through this, and the 30 ms
 * default is observable public API - the README documents it and the specs
 * assert on it - so it must not become a microtask.
 */
export declare class Timer {
    /** Lives on the prototype, not the instance. See the assignment below. */
    version: string;
    timeout: number;
    timer: ReturnType<typeof setTimeout> | 0;
    callback: () => void;
    constructor(timeout?: number, callback?: () => void);
    /**
     * Starts the timer. Calling it again while already running is a no-op.
     */
    run(): void;
    /**
     * Stops a running timer. Safe to call when it is not running.
     */
    cancel(): void;
}
