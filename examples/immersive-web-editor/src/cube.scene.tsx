import { color, config, euler, number, position3D, val, vec3 } from 'immersive-web-editor'

const cubePosition = config('Cube Position', val([0, 0, 0], position3D({ min: -4, max: 4, step: 0.1 })))

const cubeRotation = config('Cube Rotation', val([2.47,0.56,-0.15], euler({ min: -3.14, max: 3.14, step: 0.01 })))

const cubeScale = config('Cube Scale', val([1.4,4.99,1.4], vec3({ min: 0.2, max: 3, step: 0.05 })))

const cubeColor = config('Cube Color', val("#ff6b9a", color()))

const cubeRoughness = config('Cube Roughness', val(0.42, number({ min: 0, max: 1, step: 0.01 })))

const cubeMetalness = config('Cube Metalness', val(0.08, number({ min: 0, max: 1, step: 0.01 })))

export default function Cube() {
  return (
    <mesh position={cubePosition} rotation={cubeRotation} scale={cubeScale}>
      <boxGeometry />
      <meshStandardMaterial color={cubeColor} roughness={cubeRoughness} metalness={cubeMetalness} />
    </mesh>
  )
}
