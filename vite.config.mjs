import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/**
 * Vite pins the Oxc minifier to `legalComments: "none"`, which strips a
 * `rollupOptions.output.banner` back out of the minified chunk. Prepend the
 * attribution once the bundle is final instead, so both builds carry it.
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
 * Two passes write into `dist`: the default mode emits the readable bundle,
 * `--mode min` emits the minified one. Only the first pass may clear the
 * directory, otherwise the second would delete what the first just wrote.
 */
export default defineConfig(({ mode }) => {
	const minified = mode === "min";

	return {
		plugins: [bannerPlugin(`/*! ${pkg.name}@${pkg.version} */`)],

		build: {
			emptyOutDir: !minified,
			// Vite 8 minifies with Oxc; esbuild is no longer bundled.
			minify: minified ? "oxc" : false,
			// The bundle only has side effects (it populates `globalThis.MQ`),
			// so nothing may be dropped as unreachable.
			rollupOptions: {
				treeshake: { moduleSideEffects: true },
			},
			lib: {
				entry: "src/index.js",
				// Unused in practice: the entry exports nothing, so the IIFE
				// assigns no global of its own. The sources set `globalThis.MQ`
				// and `globalThis.EventEmitter` themselves.
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
