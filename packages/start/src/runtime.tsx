import { publishEditorCamera, publishPreviewViewport, type EditorCamera as EditorCameraState } from '@immersive-web-editor/adapter'
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { useEffect, useRef, type ComponentType } from 'react'
import { Camera, Matrix4 } from 'three'

export type StartSlot = ComponentType
export type StartThreeElements = ThreeElements

function createUntransformedSlot(name: string): StartSlot {
  return function UntransformedSlot(): never {
    throw new Error(
      `@react-three/start ${name} was rendered without the Vite plugin rewrite. ` +
        `Import ${name} only from discovered *.scene.tsx or *.dom.tsx entry files.`
    )
  }
}

export const Scene = createUntransformedSlot('Scene')
export const Dom = createUntransformedSlot('Dom')

export function EditorCamera() {
  const editorCameraState = useRef<EditorCameraState | null>(null)
  const editorCameraMatrix = useRef(new Matrix4())
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const disposeEditorCamera = publishEditorCamera((nextCamera) => {
      editorCameraState.current = nextCamera
      applyEditorCamera(camera, editorCameraMatrix.current, nextCamera)
      invalidate()
    })
    const viewport = publishPreviewViewport(gl.domElement)
    return () => {
      disposeEditorCamera()
      viewport.dispose()
    }
  }, [camera, gl, invalidate])

  useFrame(() => {
    if (editorCameraState.current) {
      applyEditorCamera(camera, editorCameraMatrix.current, editorCameraState.current)
    }
  })

  return null
}

function applyEditorCamera(
  camera: Camera,
  scratchMatrix: Matrix4,
  state: EditorCameraState
) {
  scratchMatrix.fromArray(state.matrixWorld)
  camera.matrixAutoUpdate = false
  camera.matrix.copy(scratchMatrix)
  camera.matrixWorld.copy(scratchMatrix)
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale)
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  camera.projectionMatrix.fromArray(state.projectionMatrix)
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}
