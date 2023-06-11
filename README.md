# Tangle - a React Server Components thing

This is a tangle of hacks, or, if you will, a work-in-progress implementation of an RSC framework.
There's a lot of embarassing bits, but it kinda works!

Though it does manage to do SSR in the same process as the main server, which is kinda cool. Just don't look at `build.ts` to find out how, it's rough.

### Features

- [x] `use client`
- [x] SSR
- [x] routing (kinda)
- [ ] actions
- [ ] a half-decent build process

### Usage

Define something like this in the `scripts` field of your `package.json`:

```
"dev": "tangle dev",
"build": "tangle build",
"start": "tangle start"
```

### Routing

Tangle has a basic filesystem router with an API intended to match NextJS's App Router .
The build expects the routes to live at `src/routes`.

Note: The router is also available as a standalone package, `@owoce/tangle-router`.

Example file layout:

```
examples/demo-1/src
└── routes
   ├── layout.tsx <--- must exist
   ├── page.tsx
   ├── profile
   │   ├── layout.tsx
   │   ├── loading.tsx  <-- adds a loading state, displayed when navigating
   │   └── [profileId]  <-- introduces a `profileId` param, as in `/profile/[profileId]`
   │       ├── layout.tsx
   │       ├── loading.tsx
   │       ├── error.tsx  <--- adds an error boundary with a fallback
   │       ├── page.tsx
   │       └── foo
   │           └── page.tsx
   └── profiles
       ├── layout.tsx
       └── page.tsx
```

#### `layout`

A `layout` file should export a server component.

```tsx
export default function MyLayout(props: {
  params: Record<string, string>;
  children: ReactNode;
});
```

It'll receive:

- `params`: `Record<string, string>`, all the params from `[someParam]` segments above it and itself
- `children`: the contents from segments below, down to the currently matched `page`

Layouts preserve state when navigating between their child segments.
You must define a root layout (`routes/layout.tsx`) with `<html>` in it.
You can use `HTMLPage` if you don't feel like typing all of that out.

#### `page.ts`

A `page` file should export a server component.

```tsx
export default function MyPage(props: { params: Record<string, string> });
```

Same as layout, it'll receive all the params from the layouts above.

#### `loading.ts`

```tsx
export default function MyLoading(props: { params: Record<string, string> });
```

`loading` will be rendered as a loading state when navigating between pages in its segment (or below). If multiple `loading` files are defined, the innermost one will be used.

#### `error.ts`

```tsx
export default function MyError();
```

#### `not-found.ts`

```tsx
export default function MyNotFound();
```

Similar to `error`, but triggered when the special `notFound()` function is called.
The status code be set to 404 (unless it's called after the headers are flushed, i.e. below a `loading` boundary).

_Note: if a request doesn't match any any routes, a built-in global `not-found` will be shown. This is currently not customizeable._

### Demo

There's a demo. To run it, build the core package, and install the bin links

```
npm ci
npm run build
npm run install-links # this actually just runs `npm ci` again, not sure how to do it properly...
```

and then

```
npm run example
```

This should bring up an app on port 8080. You can edit the code in `examples/demo-1` and if you're lucky it might even """hot reload""" by rerunning the whole build when something changed.

Have fun!

# Acknowledgements

A big thank you to [Hendrik Liebau (@unstubbable)](https://github.com/unstubbable/) for the RSC transform stream implementation that allowed us to finally get rid of that Quirks Mode warning! Check out his RSC project [`mfng`](https://github.com/unstubbable/mfng), where I borrowed it from.
