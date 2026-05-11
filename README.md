<p align="center">
  <img src="./logo.png" width="120" alt="react-three-start" />
</p>

<h1 align="center">react-three-start</h1>

<h3 align="center">
  Boilerplate-free React Three Fiber apps using file-based scene composition.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@react-three/start"><img src="https://img.shields.io/npm/v/@react-three/start?style=flat&colorA=000000&colorB=000000" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" alt="MIT license" /></a>
</p>

```bash
npx @react-three/start create my-app
```

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

## Why not Vite or Next.js?

| Use | Good for | Still missing |
| --- | --- | --- |
| Plain Vite | Fast React apps | R3F app structure, Canvas shell, file-based scene/DOM composition |
| Next.js | Routed web apps | A simple client-first R3F mental model |
| `react-three-start` | R3F apps | Only your actual scene and DOM files |

It is not a full web framework. It is a small start layer for R3F apps, games, editors, configurators, XR experiments, and visual tools.

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

## Ecosystem

- [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber)
- [`@react-three/xr`](https://github.com/pmndrs/xr)
- [`@react-three/rapier`](https://github.com/pmndrs/react-three-rapier)
- [`@react-three/drei`](https://github.com/pmndrs/drei)

## License

MIT
