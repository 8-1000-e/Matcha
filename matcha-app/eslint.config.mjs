import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	{
		rules: {
			indent: ["error", "tab"],
			"keyword-spacing": ["error", { after: true }],
			"semi-spacing": ["error", { before: false, after: true }],
			curly: ["error", "multi-line", "consistent"],
			"nonblock-statement-body-position": ["error", "below"],
			"import/order": [
				"error",
				{
					groups: [
						"builtin",
						"external",
						"internal",
						"parent",
						"sibling",
						"index",
					],
					"newlines-between": "never",
					alphabetize: { order: "asc", caseInsensitive: true },
				},
			],
		},
	},
	globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;