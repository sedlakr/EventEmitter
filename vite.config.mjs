import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/**
 * Vite pins the Oxc minifier to `legalComments: "none"`, which strips a
 * `rollupOptions.output.banner` back out of the minified chunk. Prepend the
 * attribution once the bundle is final instead, so every build carries it.
 * @param {string} text
 * @returns {import("vite").Plugin}
 */
function bannerPlugin(text) {
	return {
		name: "mq:banner",
		enforce: "post",
		generateBundle(_options, bundle) {
			for (const chunk of Object.values(bundle)) {
				if (chunk.type === "chunk") {
					chunk.code = `${text}\n${chunk.code}`;
				}
			}
		},
	};
}

/**
 * Four passes write into `dist`, selected by `--mode`:
 *
 * - `esm`   - `index`/`pure` as ES modules (`.mjs`). Runs first and is the only
 *             pass allowed to clear the directory.
 * - `cjs`   - the same two entries as CommonJS (`.js`).
 * - default - the readable classic-script bundle, `dist/mq.js`.
 * - `min`   - the minified one, `dist/mq.min.js`.
 *
 * ESM and CJS are separate passes rather than one two-format pass because both
 * emit a shared chunk for what `index` and `pure` have in common, and the
 * chunk's extension has to match its module system. Emitting both at once
 * gives every chunk the same extension, so Node either mis-parses the chunk or
 * has to reparse it and warns.
 *
 * `tsc` then writes the declarations on top. The package has no
 * `"type": "module"`, so `.js` stays CommonJS and the script bundles remain
 * loadable by both `<script src>` and `require()`, exactly as before.
 */
export default defineConfig(({ mode }) => {
	const isEsm = mode === "esm";
	const isCjs = mode === "cjs";
	const isModule = isEsm || isCjs;
	const minified = mode === "min";
	const moduleExt = isEsm ? "mjs" : "js";

	return {
		plugins: [bannerPlugin(`/*! ${pkg.name}@${pkg.version} */`)],

		// Keeps the `version` property on each class in step with the release
		// instead of the hardcoded "1.0" it carried for years.
		define: {
			__MQ_VERSION__: JSON.stringify(pkg.version),
		},

		build: {
			// Only the first pass clears dist, or later passes would delete it.
			emptyOutDir: isEsm,
			// Vite 8 minifies with Oxc; esbuild is no longer bundled.
			minify: minified ? "oxc" : false,
			rollupOptions: {
				// The entries exist for their side effects (populating
				// `globalThis.MQ`), so nothing may be dropped as unreachable.
				treeshake: { moduleSideEffects: true },
				output: { chunkFileNames: `chunks/[name]-[hash].${moduleExt}` },
			},
			lib: isModule
				? {
						entry: { index: "src/index.ts", pure: "src/pure.ts" },
						formats: [isEsm ? "es" : "cjs"],
						fileName: (_format, name) => `${name}.${moduleExt}`,
					}
				: {
						entry: "src/global.ts",
						// Unused: the entry exports nothing, so the IIFE assigns
						// no global of its own.
						name: "MQ",
						formats: ["iife"],
						fileName: () => (minified ? "mq.min.js" : "mq.js"),
					},
		},

		test: {
			environment: "jsdom",
			globals: true,
			setupFiles: ["./vitest.setup.js"],
			// The specs predate the `*.test.js` convention.
			include: ["test/**/*.js"],
			// Jasmine reset spies between specs; match that.
			restoreMocks: true,
			benchmark: {
				include: ["performanceTests/**/*.bench.js"],
			},
		},
	};
});
