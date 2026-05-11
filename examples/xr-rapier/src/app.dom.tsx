import { Canvas } from '@react-three/fiber'
import { Scene } from '@react-three/start'

export default function App() {
  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        background: '#111',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <Canvas shadows camera={{ position: [0, 2, 6], fov: 45 }}>
        <Scene />
      </Canvas>
    </main>
  )
}
