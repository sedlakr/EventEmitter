import js from "@eslint/js";
import globals from "globals";

/**
 * Replaces the previous `.eslintrc`, which listed ~200 rules by hand and was
 * never actually invoked (no lint script, no Grunt task). Almost all of those
 * rules were stylistic and are now Prettier's job; what remains here is the
 * correctness subset that Prettier cannot express.
 */
export default [
	{
		ignores: ["dist/**", "node_modules/**", ".grunt/**"],
	},

	js.configs.recommended,

	{
		// Correctness rules kept from the old .eslintrc that `recommended`
		// does not already cover.
		rules: {
			eqeqeq: "error",
			curly: "error",
			"no-eval": "error",
			"no-implied-eval": "error",
			"no-new-func": "error",
			"no-return-assign": "error",
			"no-throw-literal": "error",
			"no-var": "warn",
			"consistent-return": "error",
			"default-case": "warn",
			"no-shadow": "warn",
		},
	},

	{
		// The sources are loaded as classic scripts that build up a shared `MQ`
		// namespace, so `MQ` is written across files rather than imported.
		files: ["src/**/*.js"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			globals: {
				...globals.browser,
				MQ: "writable",
				EventEmitter: "writable",
			},
		},
	},

	{
		files: ["test/**/*.js", "performanceTests/**/*.js", "vitest.setup.js"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.vitest,
				MQ: "readonly",
				EventEmitter: "readonly",
			},
		},
		rules: {
			// The specs predate `let`/`const` and are otherwise untouched.
			"no-var": "off",
		},
	},

	{
		files: ["*.mjs"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			globals: globals.node,
		},
	},
];
