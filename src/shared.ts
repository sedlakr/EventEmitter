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
const REGISTRY = Symbol.for("@sedlak.r/mq");

/** What a copy publishes for later copies to adopt. */
export interface SharedRuntime {
	/** Version of the copy that won the race, for mismatch reporting. */
	version: string;
	[member: string]: unknown;
}

type RegistryHost = { [REGISTRY]?: SharedRuntime };

/**
 * Returns the already-published runtime, or publishes and returns this copy's.
 *
 * The factory is only called when this copy is first, so a later copy never
 * pays to construct a `Store` it will not use.
 */
export function adoptOrPublish(version: string, create: () => SharedRuntime): SharedRuntime {
	const host = globalThis as RegistryHost;
	const existing = host[REGISTRY];

	if (existing) {
		if (existing.version !== version) {
			console.warn(
				`EventEmitter: using @sedlak.r/mq ${existing.version}, which loaded first, but this copy is ` +
					`${version}. Both are present in the bundle; they now share one event bus, and the older ` +
					`API is the one in effect. Deduplicate the dependency to remove this warning.`,
			);
		}
		return existing;
	}

	const runtime = create();

	host[REGISTRY] = runtime;
	return runtime;
}
