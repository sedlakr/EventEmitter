## Unreleased

## 2.0.0

Supersedes the `2.0.0-rc.1` … `2.0.0-rc.5` prereleases; this entry describes the
whole change from `1.5.0`, since the rc-to-rc history is not useful to anyone
upgrading. Do not use the prereleases - rc.1 shipped without type-position
declarations and rc.3 crashed on `subscribe()` when the context was not an object.

### Breaking

- `demand()` throws an `Error` instead of a bare string when an event has more
  than one handler. Callers doing `catch (e) { ... e.message ... }` previously
  got `undefined`; `catch (e) { ... e ... }` now yields an `Error`, not a string.

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

### Added

- TypeScript sources, with type declarations shipped in the package.
- ES module and CommonJS builds alongside the existing classic-script bundle.
- `@sedlak.r/mq/pure` entry point - the same API with no `MQ` / `EventEmitter`
  globals defined.
- Duplicate copies of the package share one event bus. A bundler can easily
  produce more than one copy - a library bundling it plus the host app importing
  it, or an ESM and a classic-script build side by side - and each copy used to
  build its own `Store`, so events sent through one never reached handlers
  subscribed through another, silently and with no error.

    The first copy to load now publishes its classes and its single emitter under
    `Symbol.for("@sedlak.r/mq")`; later copies adopt those and leave their own
    inert. `import { EventEmitter } from "@sedlak.r/mq"`, `import "@sedlak.r/mq"`,
    `@sedlak.r/mq/pure` and the `<script src>` bundle all resolve to the same
    emitter, in any combination. A version mismatch between copies warns once and
    names both versions.

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
- `npm test` ran `grunt test`, a task that was never registered.

### Types

The shipped declarations replace the hand-written ambient `.d.ts` consumers used
to maintain themselves, so they deliberately match the shape those had:

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

### Changed

- Build moved from Grunt (concat + uglify) to Vite 8 library mode.
- Tests moved from grunt-contrib-jasmine to Vitest + jsdom; coverage re-enabled.
- `performanceTests` are `vitest bench` benchmarks instead of wall-clock assertions.
- ESLint flat config replaces the `.eslintrc` that was never actually invoked;
  Prettier added; typescript-eslint lints the sources.
- GitHub Actions replaces the retired CodeShip integration.
- pnpm replaces npm; the version is pinned by `packageManager` and provided by
  Corepack.

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
