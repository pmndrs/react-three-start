import { Canvas } from '@react-three/fiber'
import { Scene } from '@react-three/start'
import { config, number, position3D, val } from 'immersive-web-editor'

const cameraPosition = config('Camera Position', val([0, 1.4, 5], position3D({ min: -10, max: 10, step: 0.1 })))

const cameraFov = config('Camera FOV', val(45, number({ min: 20, max: 80, step: 1 })))

export default function App() {
  return (
    <Canvas camera={{ position: cameraPosition, fov: cameraFov }}>
      <Scene />
    </Canvas>
  )
}
