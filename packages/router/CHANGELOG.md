# @owoce/tangle-router

## 0.0.8

### Patch Changes

- 19bad1e: forward all props from Link onto the underlying `<a>`
- edf6d8f: add rudimentary revalidatePaths, scaffold reacting to server action results

## 0.0.7

### Patch Changes

- 2ac29cb: throw notFound() from ServerRouter for unmatched paths

## 0.0.6

### Patch Changes

- aad1e47: fix: notFound was incorrectly exported from a "use client" file, making it impossible to call it on the server

## 0.0.5

### Patch Changes

- 85dbc93: extract router to a separate package
