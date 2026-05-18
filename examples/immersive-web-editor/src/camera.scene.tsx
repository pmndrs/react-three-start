import { color, config, val } from 'immersive-web-editor'

const background = config('Scene Background', val("#f7f4ec", color()))

export default function Background() {
  return <color attach="background" args={[background]} />
}
