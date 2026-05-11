import { Suspense } from 'react'
import { Physics } from '@react-three/rapier'
import { Scene } from '@react-three/start'

export default function PhysicsWrapper() {
  return (
    <Suspense fallback={null}>
      <Physics>
        <Scene />
      </Physics>
    </Suspense>
  )
}
