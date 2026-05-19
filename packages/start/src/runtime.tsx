import { publishEditorCamera, publishPreviewViewport, type EditorCamera as EditorCameraState } from '@immersive-web-editor/adapter'
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Matrix4, PerspectiveCamera } from 'three'

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
  const [hasEditorCamera, setHasEditorCamera] = useState(false)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const disposeEditorCamera = publishEditorCamera((camera) => {
      editorCameraState.current = camera
      setHasEditorCamera(true)
      invalidate()
    })
    const viewport = publishPreviewViewport(gl.domElement)
    return () => {
      disposeEditorCamera()
      viewport.dispose()
    }
  }, [gl, invalidate])

  return hasEditorCamera ? <EditorCameraRenderer cameraState={editorCameraState} /> : null
}

function EditorCameraRenderer({
  cameraState
}: {
  cameraState: { current: EditorCameraState | null }
}) {
  const editorCamera = useRef(new PerspectiveCamera(45))
  const editorCameraMatrix = useRef(new Matrix4())

  useFrame(({ gl, scene }) => {
    if (cameraState.current) {
      applyEditorCamera(editorCamera.current, editorCameraMatrix.current, cameraState.current)
    }

    gl.render(scene, editorCamera.current)
  }, 1)

  return null
}

function applyEditorCamera(
  camera: PerspectiveCamera,
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
