## Unreleased

## 2.0.0-rc.5

### Fixed

- Duplicate copies of the package now share one event bus. A bundler can easily
  produce more than one copy - a library bundling it plus the host app importing
  it, or an ESM and a classic-script build side by side - and each copy used to
  build its own `Store`. Events sent through one never reached handlers
  subscribed through another, silently and with no error, and whichever copy
  loaded last overwrote `globalThis.MQ` and `globalThis.EventEmitter`.

    The first copy to load now publishes its classes and its single emitter under
    `Symbol.for("@sedlak.r/mq")`; later copies adopt those and leave their own
    inert. `import { EventEmitter } from "@sedlak.r/mq"`, `import "@sedlak.r/mq"`,
    `@sedlak.r/mq/pure` and the `<script src>` bundle all resolve to the same
    emitter, in any combination.

    The "already exists on globalThis, redefining" warnings no longer fire for a
    second copy of this package, since that is now the registry working as
    intended. They still fire when something else defined those globals. A
    version mismatch between copies warns once and names both versions.

### Changed

- `@sedlak.r/mq/pure` still defines no readable global, but does use the
  `Symbol.for` registry - that is the only way copies can find each other.

## 2.0.0-rc.4

### Fixed

- `subscribe()` on a DOM element no longer throws `TypeError: Invalid value used
as weak map key` when the emitter's context is not an object. `create()` may be
  called with no argument at all, giving a context of `undefined`, and callers
  also pass strings; neither can key the WeakMap that rc.3 introduced to index
  element bindings. Object contexts are still held weakly, so dropping one still
  releases its listeners; other contexts use an ordinary Map.

    This was a regression in rc.3, introduced by the fix for `unsubscribe()`
    leaking DOM listeners.

### Breaking

- `unsubscribe(name)` with only an event name now removes that event's handlers
  for the emitter's context. It previously fell into the no-argument shape and
  routed through `removeByContext`, dropping **every** subscription the context
  had - and on the default context, every subscription in the application,
  whichever context registered it. A caller asking to detach one event silently
  lost all of them; only a default-context caller got the "unbind all" warning,
  and a custom-context caller got no signal at all.

    Anyone relying on `unsubscribe(name)` to tear down a whole context should call
    `unsubscribe()` with no arguments, which has always meant exactly that.

    Removal on the default context still ignores both the context and the handler
    and drops every handler under that name. That is unchanged, and now documented
    in the README rather than left to be discovered.

## 2.0.0-rc.3

> Contains behaviour changes. `demand()` now throws an `Error` where it used to
> throw a string, which is breaking for anyone catching it - a `2.0.0` release
> rather than a minor one.
>
> Published under the `rc` dist-tag, so `npm install @sedlak.r/mq` keeps
> resolving to 1.5.0. Install this one explicitly with `@sedlak.r/mq@rc` or by
> exact version.

### Breaking

- `demand()` throws an `Error` instead of a bare string when an event has more
  than one handler. Callers doing `catch (e) { ... e.message ... }` previously
  got `undefined`; `catch (e) { ... e ... }` now yields an `Error`, not a string.

### Types

The shipped declarations are a drop-in replacement for a hand-written ambient
`.d.ts`, so they deliberately match the shape consumers already had:

- `EventEmitter` and `MQ.Emitter` / `MQ.Store` / `MQ.Timer` resolve in type
  position as well as value position.
- `request()`, `ctxRequest()` and `demand()` are generic and default to `any`,
  matching the previous contract. Pass the type to narrow -
  `request<Ticket>("getTicket")` - rather than casting the result.
- Subscribe handlers receive `any` rather than `unknown`. An event bus cannot
  know what an event carries, and every caller indexes straight into the
  payload; `unknown` would force a cast at every callback for no real safety.
- A context may be any non-nullish value, not only an object. Contexts are
  compared by identity, and callers do pass strings.

### Added

- TypeScript sources, with type declarations shipped in the package
- ES module and CommonJS builds alongside the existing classic-script bundle
- `@sedlak.r/mq/pure` entry point - the same API with nothing written to `globalThis`

### Changed

- build moved from Grunt (concat + uglify) to Vite 8 library mode
- tests moved from grunt-contrib-jasmine to Vitest + jsdom; coverage reporting re-enabled
- `performanceTests` are now `vitest bench` benchmarks instead of wall-clock assertions
- ESLint 9 flat config replaces the `.eslintrc` that was never actually invoked; Prettier added
- GitHub Actions replaces the retired CodeShip integration

### Fixed

- `emitter.unsubscribe()` with no arguments now removes the context's DOM element
  bindings as well as its named-event handlers. It previously left every
  `subscribe(element, type, handler)` listener attached, leaking them - despite
  README examples 2 and 3 documenting the opposite. Bindings made by other
  contexts on the same element are untouched.
- Removing a handler by name on the default context now marks it removed before
  dropping it, so a dispatch already in flight stops calling it. The contextual
  path already did this; the default-context path replaced the array without
  marking, so `evaluate()` - which iterates a clone - kept calling handlers that
  had just unsubscribed.
- `Emitter`, `Store` and `Timer` report the real package version instead of a
  hardcoded `"1.0"`.
- `npm test` ran `grunt test`, a task that was never registered

## 1.5.0

### Added

- contextual watching

## 1.4.0

### Added

- contextual request

## 1.3.0

### Changed

- removed IE8 support
- changed all window. to globalThis to be working in node.js
