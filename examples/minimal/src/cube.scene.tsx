export default function Cube() {
  return (
    <mesh rotation={[0.4, 0.6, 0]}>
      <boxGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}
