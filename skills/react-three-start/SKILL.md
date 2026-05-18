---
name: react-three-start
description: Build, explain, and modify @react-three/start apps that use file-based React Three Fiber scene and DOM composition. Use when working in a react-three-start project, when the user mentions @react-three/start, react-three-start, R3F app structure, .scene.tsx/.dom.tsx files, Scene/Dom slots, wrappers, start.config.ts, or the react-three-start/r3s CLI.
---

# react-three-start

`@react-three/start` is a client-first app shell for React Three Fiber. It owns Vite/React bootstrapping, the root element, a fullscreen Canvas, scene discovery, DOM overlays, and wrapper composition. The app author mostly adds files under `src/`.

## Project Shape

```txt
src/
  cube.scene.tsx      # rendered inside <Canvas>
  lights.scene.tsx    # rendered inside <Canvas>
  hud.dom.tsx         # rendered in the DOM overlay
start.config.ts       # optional framework config
```

Use `react-three-start dev`, `react-three-start build`, and `react-three-start preview`; `r3s` is the short alias. Create apps with `npx @react-three/start create my-app`.

## Entry Files

- `src/**/*.scene.tsx` files are the 3D layer. Default-export R3F objects, lights, cameras, controls, physics bodies, or providers.
- `src/**/*.dom.tsx` files are the DOM overlay layer. Default-export normal React DOM UI.
- Entries are discovered automatically and sorted by path. Do not create a manual scene registry for ordinary app composition.
- DOM overlay content is fixed over the viewport. With the default injected Canvas, the overlay container has `pointer-events: none`, so interactive DOM controls should set `pointerEvents: 'auto'`.

## Slots And Wrappers

Import `Scene` or `Dom` from `@react-three/start` only inside discovered `*.scene.tsx` and `*.dom.tsx` entry files. The Vite plugin rewrites those imports to continuation components.

A scene file that imports and renders `<Scene />` becomes a scene wrapper. Use wrappers for providers that must surround the rest of the 3D scene: XR, physics, Suspense, controls, environment setup. Sorted filenames define nesting order.

```tsx
// src/00-xr.scene.tsx
import { Scene } from '@react-three/start'
import { Physics } from '@react-three/rapier'

export default function PhysicsWrapper() {
  return (
    <Physics>
      <Scene />
    </Physics>
  )
}
```

```txt
00-xr.scene.tsx       # outer wrapper
10-physics.scene.tsx  # inner wrapper
cube.scene.tsx        # leaf scene entry
```

A DOM file that imports and renders `<Dom />` becomes a DOM wrapper. A DOM file may also import `<Scene />` when manually owning the Canvas.

## Manual Canvas

By default, react-three-start injects a fullscreen Canvas and renders `<Scene />` inside it. When layout, shadows, camera props, XR buttons, or multiple panels need ownership, disable injection and render the Canvas from a DOM entry.

```ts
// start.config.ts
export default {
  injectCanvas: false,
  title: 'My R3F app'
}
```

```tsx
// src/app.dom.tsx
import { Canvas } from '@react-three/fiber'
import { Scene } from '@react-three/start'

export default function App() {
  return (
    <Canvas shadows camera={{ position: [0, 2, 6], fov: 45 }}>
      <Scene />
    </Canvas>
  )
}
```

`start.config.ts` may export `injectCanvas`, `title`, and a nested `vite` config object. The CLI merges `vite` with the generated Vite config and passes the remaining options to `reactThreeStart()`. Prefer `start.config.ts`; add `vite.config.ts` only when normal Vite ownership is needed.

## Agent Rules Of Thumb

- Add new visual content as small `*.scene.tsx` leaves unless it must wrap other scene entries.
- Add UI as `*.dom.tsx`; keep interactive overlay elements explicitly pointer-enabled.
- Use numeric filename prefixes for wrapper order, not import order.
- Keep `Scene` and `Dom` imports in entry files only; pass ordinary React components through normal imports.
- Reach for manual Canvas only when the default fullscreen Canvas is too limiting.
