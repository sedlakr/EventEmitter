/** What a copy publishes for later copies to adopt. */
export interface SharedRuntime {
    /** Version of the copy that won the race, for mismatch reporting. */
    version: string;
    [member: string]: unknown;
}
/**
 * Returns the already-published runtime, or publishes and returns this copy's.
 *
 * The factory is only called when this copy is first, so a later copy never
 * pays to construct a `Store` it will not use.
 */
export declare function adoptOrPublish(version: string, create: () => SharedRuntime): SharedRuntime;
