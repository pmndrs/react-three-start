<p align="center">
  <img src="./logo.png" width="120" alt="react-three-start" />
</p>

<h1 align="center">react-three-start</h1>

<h3 align="center">
  Boilerplate-free React Three Fiber apps using file-based DOM and scene composition.
</h3>

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
  cube.scene.tsx
  lights.scene.tsx
  hud.dom.tsx
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

## Wrappers

```tsx
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

## Manual Canvas

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

## License

MIT
