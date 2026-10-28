# ESLint — configuration & migration

## ESLint v10 flat config (replaces .eslintrc.json)

**Scope:** `stack:node`

ESLint v10 removed the legacy `.eslintrc.json` / `.eslintrc.js` format. The new format is
`eslint.config.js` (CommonJS `module.exports = [...]`).

### Migration steps

1. Delete `.eslintrc.json` (or `.eslintrc.js`).
2. Create `eslint.config.js`:

```js
"use strict";
const globals = require("globals");

module.exports = [
  {
    files: ["src/**/*.js", "tests/**/*.js"],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.node } },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-console": "off",
      "eqeqeq": "error",
      "no-var": "error",
    },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser } },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-console": "off",
      "eqeqeq": "error",
      "no-var": "error",
    },
  },
];
```

3. Add the `globals` package: `npm install --save-dev globals`
4. Bump `engines.node` in `package.json` to `>=18.18.0` (ESLint 10 requirement).

### Key differences from .eslintrc

| Old (v8)                  | New (v10)                              |
|---------------------------|----------------------------------------|
| `"env": { "node": true }` | `globals: { ...globals.node }`         |
| `"env": { "browser": true }` | `globals: { ...globals.browser }`   |
| Single config object       | Array of config objects (one per glob) |
| `.eslintrc.json`           | `eslint.config.js`                     |

### Why separate scopes for Node and browser?

Node globals (`process`, `__dirname`, `require`, …) and browser globals (`window`, `document`,
`fetch`, …) overlap in wrong places. Separate array entries per file glob let ESLint flag
`require()` in browser code and `document` in Node code — both `no-undef` violations.

⏳ Verify after: 2027-01 — ESLint major versions; globals package API.
