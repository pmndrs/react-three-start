import { publishEditorCamera, type CameraMatrix } from '@immersive-web-editor/adapter'
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Matrix4, PerspectiveCamera, type Camera } from 'three'

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
  const editorCameraMatrix = useRef<CameraMatrix | null>(null)
  const [hasEditorCamera, setHasEditorCamera] = useState(false)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    return publishEditorCamera((matrix) => {
      editorCameraMatrix.current = matrix
      setHasEditorCamera(true)
      invalidate()
    })
  }, [invalidate])

  return hasEditorCamera ? <EditorCameraRenderer matrix={editorCameraMatrix} /> : null
}

function EditorCameraRenderer({
  matrix
}: {
  matrix: { current: CameraMatrix | null }
}) {
  const editorCamera = useRef(new PerspectiveCamera(45))
  const editorCameraMatrix = useRef(new Matrix4())
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  useEffect(() => {
    syncEditorCameraProjection(editorCamera.current, camera, size.width / size.height)
  }, [camera, size.height, size.width])

  useFrame(({ camera, gl, scene, size }) => {
    if (matrix.current) {
      applyEditorCameraMatrix(editorCamera.current, editorCameraMatrix.current, matrix.current)
    }

    syncEditorCameraProjection(editorCamera.current, camera, size.width / size.height)
    gl.render(scene, editorCamera.current)
  }, 1)

  return null
}

function applyEditorCameraMatrix(
  camera: PerspectiveCamera,
  scratchMatrix: Matrix4,
  matrix: CameraMatrix
) {
  scratchMatrix.fromArray(matrix)
  camera.matrixAutoUpdate = false
  camera.matrix.copy(scratchMatrix)
  camera.matrixWorld.copy(scratchMatrix)
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale)
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
}

function syncEditorCameraProjection(
  editorCamera: PerspectiveCamera,
  renderCamera: Camera,
  aspect: number
) {
  if (renderCamera instanceof PerspectiveCamera) {
    editorCamera.fov = renderCamera.fov
    editorCamera.near = renderCamera.near
    editorCamera.far = renderCamera.far
    editorCamera.zoom = renderCamera.zoom
  }

  editorCamera.aspect = aspect
  editorCamera.updateProjectionMatrix()
}
