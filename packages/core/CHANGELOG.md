# @owoce/tangle

## 0.1.0

### Minor Changes

- 03fdffa: Implement inline "use server", move "use server" transformations into @owoce/babel-rsc

### Patch Changes

- 03fdffa: Update react packages to 0.0.0-experimental-bbb9cb116-20231117
- Updated dependencies [03fdffa]
  - @owoce/tangle-router@0.1.0

## 0.0.8

### Patch Changes

- edf6d8f: implement basic support for server actions - bundler transform, client wiring, server-side handlers
- 19bad1e: rudimentary css support (enough to run tailwind)
- Updated dependencies [19bad1e]
- Updated dependencies [edf6d8f]
  - @owoce/tangle-router@0.0.8

## 0.0.7

### Patch Changes

- 2ac29cb: insert inline RSC chunks into the response properly (based on unstubbable/mfng)
- 2ac29cb: send 404 status code if a notFound() was thrown, builtin global 404/500 pages
- Updated dependencies [2ac29cb]
  - @owoce/tangle-router@0.0.7

## 0.0.6

### Patch Changes

- aad1e47: fix: notFound was incorrectly exported from a "use client" file, making it impossible to call it on the server
- Updated dependencies [aad1e47]
  - @owoce/tangle-router@0.0.6

## 0.0.5

### Patch Changes

- 85dbc93: extract router to a separate package
- Updated dependencies [85dbc93]
  - @owoce/tangle-router@0.0.5
