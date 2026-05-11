import { Scene } from '@react-three/start'
import { XR, createXRStore } from '@react-three/xr'

const store = createXRStore()

export default function XRWrapper() {
  return (
    <XR store={store}>
      <Scene />
    </XR>
  )
}
