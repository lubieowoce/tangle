# Tangle - a React Server Components thing

This is a tangle of hacks, or, if you will, a work-in-progress implementation of an RSC framework.
There's a lot of embarassing bits! There's not even a working `build` command yet!

Though it does manage to do SSR in the same process as the main server, which is kinda cool. Just don't look at `build.ts` to find out how, it's rough.

### Features

- [x] `use client`
- [x] SSR (...with a quirks mode warning)
- [ ] routing
- [ ] actions
- [ ] a half-decent build process

### Usage

Currently, the framework assumes there's a server component at `src/index.tsx`, and serves that under `localhost:8080/`.
There's a `useNavigation` thingy that you can use to change the current props.
As a stopgap for a router, you define a `src/paths.ts` that exports functions for converting the url to props and vice versa.

### Demo

There's a demo. To run it, build the core package with

```
npm run build
```

and then

```
npm run example
```

This should bring up an app on port 8080. You can edit the code in `examples/demo-1` and if you're lucky it might even """hot reload""" by rerunning the whole build when something changed.

Have fun!
