import { CuboidCollider, RigidBody } from '@react-three/rapier'

export default function Floor() {
  return (
    <RigidBody type="fixed">
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#4f7a6a" />
      </mesh>
      <CuboidCollider args={[6, 0.1, 6]} position={[0, -0.1, 0]} />
    </RigidBody>
  )
}
