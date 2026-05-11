import type { ThreeElements } from '@react-three/fiber'
import type { ComponentType } from 'react'

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
