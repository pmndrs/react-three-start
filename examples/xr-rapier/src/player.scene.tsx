import { RigidBody } from '@react-three/rapier'

export default function Player() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight castShadow position={[4, 6, 4]} intensity={2.5} />
      <RigidBody restitution={0.7} position={[0, 2, 0]}>
        <mesh castShadow>
          <boxGeometry />
          <meshStandardMaterial color="#ff6b8a" />
        </mesh>
      </RigidBody>
    </>
  )
}
