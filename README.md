<p align="center">
  <img src="./logo.png" width="120" alt="react-three-start" />
</p>

<h1 align="center">react-three-start</h1>

<h3 align="center">
  A meta-framework for boilerplate-free React Three Fiber apps using file-based scene composition.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@react-three/start"><img src="https://img.shields.io/npm/v/@react-three/start?style=flat&colorA=000000&colorB=000000" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" alt="MIT license" /></a>
</p>

```bash
npx @react-three/start create my-app
```

## What is it?

`react-three-start` is a meta-framework for [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber).

In the same way [`SolidStart`](https://docs.solidjs.com/solid-start) adds application conventions around Solid, and [`TanStack Start`](https://tanstack.com/start/latest/docs) adds full-stack conventions around TanStack Router, `react-three-start` adds app-level conventions around R3F.

It gives R3F projects a default shell, a file-based scene graph, DOM overlay composition, ordered wrapper composition, a CLI, and a Vite integration. You write the parts that make your app unique: meshes, lights, cameras, physics, XR providers, controls, UI, and editor panels.

It is intentionally client-first. There is no routing system, server function layer, data loader, or deployment runtime. The framework boundary is the 3D app shell.

## Why

React Three Fiber is great. The setup around it is repetitive.

Every app starts with the same wiring: Vite config, HTML shell, React root, Canvas, scene imports, DOM overlays, and provider nesting.

`react-three-start` removes that boilerplate. You add files; it builds the DOM and scene around them.

## How it works

```txt
src/
  cube.scene.tsx    # renders inside Canvas
  lights.scene.tsx  # renders inside Canvas
  hud.dom.tsx       # renders in the DOM overlay
```

Scene files build the 3D layer. DOM files build the UI layer.

```tsx
// src/cube.scene.tsx
export default function Cube() {
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}
```

```bash
react-three-start dev
```

No `vite.config.ts`, no `index.html`, no manual React entry, no scene registry.

## Where it fits

| Tool | Good for | Relationship to R3F |
| --- | --- | --- |
| Plain Vite | Fast React apps | You still wire the HTML shell, React root, Canvas, and scene imports yourself |
| Next.js | Routed React web apps | Great when the website is primary; heavier than needed for many client-first 3D apps |
| [SolidStart](https://docs.solidjs.com/solid-start) | Full-stack Solid apps | A useful reference point for what a framework layer can provide around a UI runtime |
| [TanStack Start](https://tanstack.com/start/latest/docs) | Full-stack React or Solid apps powered by TanStack Router | A useful reference point for file-based app conventions, routing, SSR, and server functions |
| `react-three-start` | R3F apps, games, editors, configurators, XR experiments, and visual tools | The Canvas and scene are primary; the framework gives you R3F-specific structure instead of web-app routing |

Think of it as "Start" for React Three Fiber: smaller and more focused than a full web framework, but more opinionated than a bare Vite app.

## Wrappers

Wrappers are scene files too. Import `Scene` where the lower scene should continue.

```tsx
// src/00-xr.scene.tsx
import { Scene } from '@react-three/start'
import { XR, createXRStore } from '@react-three/xr'

const store = createXRStore()

export default function XRScene() {
  return (
    <XR store={store}>
      <Scene />
    </XR>
  )
}
```

Sorted filenames define nesting:

```txt
00-xr.scene.tsx
10-physics.scene.tsx
cube.scene.tsx
```

## Manual Canvas

The default is a fullscreen Canvas. Own it when you need layout control.

```ts
// start.config.ts
export default {
  injectCanvas: false
}
```

```tsx
// src/app.dom.tsx
import { Canvas } from '@react-three/fiber'
import { Scene } from '@react-three/start'

export default function App() {
  return (
    <Canvas>
      <Scene />
    </Canvas>
  )
}
```

## Commands

```bash
react-three-start dev
react-three-start build
react-three-start preview
```

Alias:

```bash
r3s dev
```

## License

MIT
