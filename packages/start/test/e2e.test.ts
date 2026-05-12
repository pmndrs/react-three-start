import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const testRoot = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(testRoot, '..')
const cliPath = path.join(packageRoot, 'dist', 'cli.js')

let tempRoot: string

beforeAll(async () => {
  await execa('pnpm', ['build'], { cwd: packageRoot })
  tempRoot = await mkdtemp(path.join(os.tmpdir(), 'react-three-start-e2e-'))
})

afterAll(async () => {
  if (tempRoot) {
    await rm(tempRoot, { force: true, recursive: true })
  }
})

describe('r3s build', () => {
  it('builds a file-based R3F app through the CLI', async () => {
    await writeFile(
      path.join(tempRoot, 'package.json'),
      JSON.stringify(
        {
          type: 'module'
        },
        null,
        2
      )
    )
    await linkDependencies(tempRoot)
    await mkdir(path.join(tempRoot, 'src'))

    await writeFile(
      path.join(tempRoot, 'start.config.ts'),
      `export default {
  title: 'E2E R3S',
  injectCanvas: false
}
`
    )
    await writeFile(
      path.join(tempRoot, 'src/00-scene-wrapper.scene.tsx'),
      `import { Scene as InnerScene } from '@react-three/start'

export default function SceneWrapper() {
  return (
    <group name="scene-wrapper">
      <InnerScene />
    </group>
  )
}
`
    )
    await writeFile(
      path.join(tempRoot, 'src/cube.scene.tsx'),
      `export default function Cube() {
  return (
    <mesh name="e2e-cube">
      <boxGeometry />
      <meshBasicMaterial color="hotpink" />
    </mesh>
  )
}
`
    )
    await writeFile(
      path.join(tempRoot, 'src/app.dom.tsx'),
      `import { Scene } from '@react-three/start'

export default function App() {
  return (
    <main data-e2e="dom-root">
      <Scene />
    </main>
  )
}
`
    )

    await execa(path.join(tempRoot, 'node_modules', '.bin', 'r3s'), ['build', tempRoot], {
      cwd: tempRoot
    })

    const html = await readFile(path.join(tempRoot, 'dist', 'index.html'), 'utf8')
    expect(html).toContain('<title>E2E R3S</title>')
    expect(html).toContain('/assets/')

    const assetDir = path.join(tempRoot, 'dist', 'assets')
    const bundle = await readBundle(assetDir)
    expect(bundle).toContain('dom-root')
    expect(bundle).toContain('scene-wrapper')
    expect(bundle).toContain('e2e-cube')
    expect(bundle).not.toContain('@react-three/start')
  })
})

async function linkDependencies(root: string) {
  await mkdir(path.join(root, 'node_modules', '@react-three'), { recursive: true })
  await mkdir(path.join(root, 'node_modules', '@vitejs'), { recursive: true })
  await mkdir(path.join(root, 'node_modules', '.bin'), { recursive: true })

  await symlink(packageRoot, path.join(root, 'node_modules', '@react-three', 'start'), 'dir')
  await symlink(cliPath, path.join(root, 'node_modules', '.bin', 'r3s'), 'file')
  await symlink(
    path.join(packageRoot, 'node_modules', '@react-three', 'fiber'),
    path.join(root, 'node_modules', '@react-three', 'fiber'),
    'dir'
  )
  await symlink(
    path.join(packageRoot, 'node_modules', '@vitejs', 'plugin-react'),
    path.join(root, 'node_modules', '@vitejs', 'plugin-react'),
    'dir'
  )

  for (const name of ['react', 'react-dom', 'three', 'vite']) {
    await symlink(path.join(packageRoot, 'node_modules', name), path.join(root, 'node_modules', name), 'dir')
  }
}

async function readBundle(assetDir: string) {
  const files = await readdir(assetDir)
  const chunks = await Promise.all(
    files
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFile(path.join(assetDir, file), 'utf8'))
  )
  return chunks.join('\n')
}
