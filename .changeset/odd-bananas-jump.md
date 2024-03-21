---
"@owoce/babel-rsc": patch
---

Fixed a bug where references to injected imports (like `registerServerReference`) would not get picked up by `@babel/plugin-transform-modules-commonjs` (except for the first one)
