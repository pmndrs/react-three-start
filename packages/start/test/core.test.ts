import { describe, expect, it } from 'vitest'
import {
  createEntriesModuleCode,
  parseStartImports,
  transformStartImports,
  type Entry
} from '../src/core'

describe('parseStartImports', () => {
  it('detects Scene and Dom named imports', () => {
    expect(parseStartImports("import { Scene, Dom } from '@react-three/start'")).toEqual({
      scene: true,
      dom: true
    })
  })

  it('ignores unrelated imports', () => {
    expect(parseStartImports("import { Canvas } from '@react-three/fiber'")).toEqual({
      scene: false,
      dom: false
    })
  })
})

describe('transformStartImports', () => {
  it('rewrites Scene imports to the provided target', () => {
    const result = transformStartImports("import { Scene } from '@react-three/start'", {
      layer: 'scene',
      isWrapper: true,
      sceneTarget: 'virtual:react-three-start/scene/1',
      domTarget: 'virtual:react-three-start/dom/0'
    })

    expect(result).toContain("import Scene from \"virtual:react-three-start/scene/1\"")
  })

  it('rewrites Dom imports in dom entries', () => {
    const result = transformStartImports("import { Dom } from '@react-three/start'", {
      layer: 'dom',
      isWrapper: true,
      sceneTarget: 'virtual:react-three-start/scene/0',
      domTarget: 'virtual:react-three-start/dom/1'
    })

    expect(result).toContain("import Dom from \"virtual:react-three-start/dom/1\"")
  })

  it('rejects Dom imports in scene entries', () => {
    expect(() =>
      transformStartImports("import { Dom } from '@react-three/start'", {
        layer: 'scene',
        isWrapper: false,
        sceneTarget: 'virtual:react-three-start/scene/0',
        domTarget: 'virtual:react-three-start/dom/0'
      })
    ).toThrow('Dom can only be imported')
  })
})

describe('generated modules', () => {
  it('renders leaf entries in sorted order', () => {
    const entries: Entry[] = [
      {
        id: 'src/a.scene.tsx',
        path: '/project/src/a.scene.tsx',
        layer: 'scene',
        importsScene: false,
        importsDom: false,
        isWrapper: false
      },
      {
        id: 'src/b.scene.tsx',
        path: '/project/src/b.scene.tsx',
        layer: 'scene',
        importsScene: false,
        importsDom: false,
        isWrapper: false
      }
    ]

    const code = createEntriesModuleCode('/project', entries)
    expect(code.indexOf('jsx(Entry0')).toBeLessThan(code.indexOf('jsx(Entry1'))
  })
})
