# @owoce/babel-rsc

## 0.4.2

### Patch Changes

- ed28d95: Fixed a bug where references to injected imports (like `registerServerReference`) would not get picked up by `@babel/plugin-transform-modules-commonjs` (except for the first one)

## 0.4.1

### Patch Changes

- fbcd594: Fix serialization of extracted actions

## 0.4.0

### Minor Changes

- a6e6240: Allow specifying module id generation strategy

  ```
  options.moduleIds: "file-url-root-relative" | "file-url-absolute" | "file-url-hash"
  ```

## 0.3.0

### Minor Changes

- e553ebf: - Allow customizing the `registerServerReference` function used by the plugin
  - Add extracted action info to `file.path.node.extras`

## 0.2.0

### Minor Changes

- 1799816: Allow customizing module id generation via `createPlugin({ getModuleId(file) { ... } })`
