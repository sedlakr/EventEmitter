## Unreleased

> Contains behaviour changes. `demand()` now throws an `Error` where it used to
> throw a string, which is breaking for anyone catching it - a `2.0.0` release
> rather than a minor one.

### Breaking

- `demand()` throws an `Error` instead of a bare string when an event has more
  than one handler. Callers doing `catch (e) { ... e.message ... }` previously
  got `undefined`; `catch (e) { ... e ... }` now yields an `Error`, not a string.

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
