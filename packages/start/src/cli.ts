#!/usr/bin/env node
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import cac from 'cac'
import { execa, execaNode } from 'execa'
import fs from 'fs-extra'
import open from 'open'
import { detect, getUserAgent } from 'package-manager-detector/detect'
import { resolveCommand } from 'package-manager-detector/commands'
import pc from 'picocolors'

const require = createRequire(import.meta.url)
const packageRoot = findPackageRoot(fileURLToPath(import.meta.url))
const packageJson = fs.readJsonSync(path.join(packageRoot, 'package.json')) as { version?: string }
const cli = cac('react-three-start')

cli
  .command('dev [root]', 'Start the dev server')
  .allowUnknownOptions()
  .action(async (_root: string | undefined, _options: Record<string, unknown>) => {
    await runViteCommand('dev', process.argv.slice(3))
  })

cli
  .command('build [root]', 'Build for production')
  .allowUnknownOptions()
  .action(async () => {
    await runViteCommand('build', process.argv.slice(3))
  })

cli
  .command('preview [root]', 'Preview the production build')
  .allowUnknownOptions()
  .action(async () => {
    await runViteCommand('preview', process.argv.slice(3))
  })

cli
  .command('create [dir]', 'Create, install, start, and open a minimal app')
  .allowUnknownOptions()
  .action(async (dir = 'react-three-start-app') => {
    await createProject(dir)
  })

cli.help()
cli.version(packageJson.version ?? '0.0.0')

cli.parse()

async function runViteCommand(command: 'dev' | 'build' | 'preview', rawArgs: string[]) {
  const { root, args } = extractRoot(rawArgs)
  const { args: viteArgs, openBrowser } = extractOpenFlag(stripConfigFlags(args))
  const tempConfig = await writeCliViteConfig(root)
  const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')
  const subcommand = command === 'dev' ? [] : [command]
  const colorEnv = process.env.NO_COLOR ? {} : { FORCE_COLOR: process.env.FORCE_COLOR ?? '1' }
  const child = execaNode(viteBin, [...subcommand, ...viteArgs, '--config', tempConfig], {
    cwd: root,
    stdio: openBrowser ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    env: {
      ...process.env,
      ...colorEnv
    }
  })

  if (openBrowser) {
    pipeAndOpen(child)
  }

  await child
}

function extractRoot(rawArgs: string[]): { root: string; args: string[] } {
  const commandIndex = rawArgs.findIndex((arg) => arg === 'dev' || arg === 'build' || arg === 'preview')
  const args = commandIndex === 0 ? rawArgs.slice(1) : rawArgs
  const first = args[0]

  if (first && !first.startsWith('-')) {
    return { root: path.resolve(first), args: args.slice(1) }
  }

  return { root: process.cwd(), args }
}

function stripConfigFlags(args: string[]): string[] {
  const result: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--config' || arg === '-c') {
      index += 1
      continue
    }
    if (arg.startsWith('--config=')) continue
    result.push(arg)
  }
  return result
}

function extractOpenFlag(args: string[]): { args: string[]; openBrowser: boolean } {
  let openBrowser = false
  const filtered = args.filter((arg) => {
    if (arg === '--open' || arg === '-o' || arg.startsWith('--open=')) {
      openBrowser = true
      return false
    }
    return true
  })

  return { args: filtered, openBrowser }
}

function pipeAndOpen(child: ReturnType<typeof execaNode>) {
  let didOpen = false
  const handleOutput = (chunk: Buffer) => {
    const text = chunk.toString()
    process.stdout.write(text)

    if (didOpen) return

    const match = text.match(/Local:\s+(https?:\/\/[^\s]+)/)
    if (!match) return

    didOpen = true
    void open(match[1])
  }

  child.stdout?.on('data', handleOutput)
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk))
}

async function writeCliViteConfig(root: string): Promise<string> {
  const cacheDir = path.join(root, 'node_modules', '.react-three-start')
  await fs.ensureDir(cacheDir)

  const configPath = path.join(cacheDir, 'vite.config.mjs')
  const viteUrl = await import.meta.resolve('vite')
  const reactUrl = await import.meta.resolve('@vitejs/plugin-react')
  const pluginUrl = pathToFileURL(fileURLToPath(new URL('./plugin.js', import.meta.url))).href
  const rootJson = JSON.stringify(root)

  await fs.writeFile(
    configPath,
    `import react from ${JSON.stringify(reactUrl)};
import { defineConfig, loadConfigFromFile, mergeConfig } from ${JSON.stringify(viteUrl)};
import { reactThreeStart } from ${JSON.stringify(pluginUrl)};
import fs from 'node:fs';
import path from 'node:path';

const root = ${rootJson};
const viteConfigFiles = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs'];
const startConfigFiles = ['start.config.ts', 'start.config.mts', 'start.config.js', 'start.config.mjs'];

async function loadFirst(files, env) {
  for (const file of files) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;
    const loaded = await loadConfigFromFile(env, filePath, root);
    return loaded?.config ?? {};
  }
  return {};
}

export default defineConfig(async (env) => {
  const viteConfig = await loadFirst(viteConfigFiles, env);
  const startConfig = await loadFirst(startConfigFiles, env);
  const { vite = {}, ...startOptions } = startConfig;
  const injected = {
    root,
    plugins: [
      react(),
      reactThreeStart({
        generateHtml: true,
        ...startOptions
      })
    ]
  };

  return mergeConfig(mergeConfig(viteConfig, vite), injected);
});
`,
    'utf8'
  )

  return configPath
}

async function createProject(dir: string) {
  const root = path.resolve(dir)

  if (await fs.pathExists(root)) {
    const files = await fs.readdir(root)
    if (files.length > 0) {
      throw new Error(`Target directory is not empty: ${root}`)
    }
  }

  const name = path.basename(root)
  await fs.ensureDir(path.join(root, 'src'))
  await fs.writeJson(path.join(root, 'package.json'), await createPackageJson(name), { spaces: 2 })
  await fs.writeJson(path.join(root, 'tsconfig.json'), createTsConfig(), { spaces: 2 })
  await fs.writeFile(path.join(root, 'src', 'cube.scene.tsx'), createCubeScene(), 'utf8')

  const agent = await detectAgent()
  const install = resolveCommand(agent, 'install', [])
  if (!install) throw new Error(`Could not resolve install command for ${agent}`)

  console.log(pc.cyan(`Installing dependencies with ${agent}...`))
  await execa(install.command, install.args, { cwd: root, stdio: 'inherit' })

  console.log(pc.green('Starting dev server...'))
  await runViteCommand('dev', [root, '--host', '127.0.0.1', '--open'])
}

async function detectAgent() {
  const userAgent = getUserAgent()
  if (userAgent) return userAgent

  const detected = await detect({ cwd: process.cwd() })
  return detected?.agent ?? 'pnpm'
}

async function createPackageJson(name: string) {
  return {
    name,
    private: true,
    type: 'module',
    scripts: {
      dev: 'react-three-start dev',
      build: 'react-three-start build',
      preview: 'react-three-start preview'
    },
    dependencies: {
      '@react-three/fiber': '^9.1.2',
      '@react-three/start': await getStartDependency(),
      react: '^19.1.0',
      'react-dom': '^19.1.0',
      three: '^0.176.0'
    },
    devDependencies: {
      '@types/react': '^19.1.2',
      '@types/react-dom': '^19.1.2',
      '@types/three': '^0.176.0',
      typescript: '^5.8.3'
    }
  }
}

function findPackageRoot(from: string): string {
  let dir = path.dirname(from)

  while (dir !== path.dirname(dir)) {
    const packagePath = path.join(dir, 'package.json')
    if (fs.existsSync(packagePath)) {
      const packageJson = fs.readJsonSync(packagePath) as { name?: string }
      if (packageJson.name === '@react-three/start') return dir
    }
    dir = path.dirname(dir)
  }

  return process.cwd()
}

async function getStartDependency(): Promise<string> {
  const packageJson = (await fs.readJson(path.join(packageRoot, 'package.json'))) as {
    private?: boolean
    version?: string
  }

  const isSourceCheckout = packageRoot.includes(`${path.sep}packages${path.sep}start`)

  if (isSourceCheckout || packageJson.private || !packageJson.version || packageJson.version === '0.0.0') {
    return `file:${packageRoot}`
  }

  return `^${packageJson.version}`
}

function createTsConfig() {
  return {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      strict: true,
      skipLibCheck: true,
      types: ['@react-three/start']
    },
    include: ['src']
  }
}

function createCubeScene() {
  return `export default function Cube() {
  return (
    <mesh rotation={[0.4, 0.6, 0]}>
      <boxGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}
`
}
