/**
 * Timer for emitter.
 *
 * Wraps a single `setTimeout`. `notify()` batches through this, and the 30 ms
 * default is observable public API - the README documents it and the specs
 * assert on it - so it must not become a microtask.
 */
export class Timer {
	/** Lives on the prototype, not the instance. See the assignment below. */
	declare version: string;

	timeout: number;
	timer: ReturnType<typeof setTimeout> | 0;
	callback: () => void;

	constructor(timeout?: number, callback?: () => void) {
		this.timeout = timeout || 30;
		this.timer = 0;
		this.callback = callback as () => void;
	}

	/**
	 * Starts the timer. Calling it again while already running is a no-op.
	 */
	run(): void {
		//already running
		if (this.timer) {
			return;
		}
		//create timer
		this.timer = setTimeout(() => {
			this.cancel();
			this.callback();
		}, this.timeout);
	}

	/**
	 * Stops a running timer. Safe to call when it is not running.
	 */
	cancel(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = 0;
		}
	}
}

Timer.prototype.version = __MQ_VERSION__;
