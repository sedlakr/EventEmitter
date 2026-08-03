## Unreleased

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
