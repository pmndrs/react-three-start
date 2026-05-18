import { color, config, number, position3D, val } from 'immersive-web-editor'

const ambientColor = config('Ambient Color', val("#ffffff", color()))

const ambientIntensity = config('Ambient Intensity', val(0.45, number({ min: 0, max: 2, step: 0.01 })))

const keyColor = config('Key Light Color', val("#fff4d6", color()))

const keyPosition = config('Key Light Position', val([3.5,5,5.09], position3D({ min: -8, max: 8, step: 0.1 })))

const keyIntensity = config('Key Light Intensity', val(2.4, number({ min: 0, max: 8, step: 0.1 })))

export default function Lights() {
  return (
    <>
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      <directionalLight color={keyColor} position={keyPosition} intensity={keyIntensity} />
    </>
  )
}
