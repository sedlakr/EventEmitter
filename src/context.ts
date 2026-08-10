import type { Context } from "./store.js";

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
const state: { mqDefault: Context } = {
	mqDefault: globalThis as unknown as Context,
};

export function getMqDefault(): Context {
	return state.mqDefault;
}

export function setMqDefault(value: Context): void {
	state.mqDefault = value;
}
