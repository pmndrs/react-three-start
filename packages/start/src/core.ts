import fs from 'node:fs'
import path from 'node:path'
export type Layer = 'scene' | 'dom'

export type StartOptions = {
  injectCanvas?: boolean
  generateHtml?: boolean
  title?: string
}

export type Entry = {
  id: string
  path: string
  layer: Layer
  importsScene: boolean
  importsDom: boolean
  isWrapper: boolean
}

export type EntryGraph = {
  scene: Entry[]
  dom: Entry[]
}

export const START_MODULE = '@react-three/start'
export const VIRTUAL_PREFIX = 'virtual:react-three-start'
export const RESOLVED_PREFIX = `\0${VIRTUAL_PREFIX}`

const sceneSuffix = '.scene.tsx'
const domSuffix = '.dom.tsx'

export function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

export function toRootImport(root: string, filePath: string): string {
  return `/${normalizePath(path.relative(root, filePath))}`
}

export function getLayer(filePath: string): Layer | null {
  if (filePath.endsWith(sceneSuffix)) return 'scene'
  if (filePath.endsWith(domSuffix)) return 'dom'
  return null
}

export function parseStartImports(source: string): { scene: boolean; dom: boolean } {
  const result = { scene: false, dom: false }
  const importPattern =
    /import\s*\{([^}]+)\}\s*from\s*['"]@react-three\/start['"]\s*;?/g
  let match: RegExpExecArray | null

  while ((match = importPattern.exec(source))) {
    const names = match[1]
      .split(',')
      .map((part) => part.trim().split(/\s+as\s+/i)[0]?.trim())

    result.scene ||= names.includes('Scene')
    result.dom ||= names.includes('Dom')
  }

  return result
}

export function hasStartSlotImport(source: string): boolean {
  const imports = parseStartImports(source)
  return imports.scene || imports.dom
}

export function walkEntries(root: string): string[] {
  const srcRoot = path.join(root, 'src')
  if (!fs.existsSync(srcRoot)) return []

  const files: string[] = []
  const visit = (dir: string) => {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (dirent.name.startsWith('.')) continue
      const next = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        visit(next)
      } else if (dirent.isFile() && getLayer(next)) {
        files.push(next)
      }
    }
  }

  visit(srcRoot)
  return files.sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)))
}

export function scanEntries(root: string): EntryGraph {
  const entries = walkEntries(root).map((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8')
    const layer = getLayer(filePath)
    if (!layer) {
      throw new Error(`Unexpected non-entry file while scanning: ${filePath}`)
    }

    const imports = parseStartImports(source)
    const isWrapper = layer === 'scene' ? imports.scene : imports.dom

    return {
      id: normalizePath(path.relative(root, filePath)),
      path: filePath,
      layer,
      importsScene: imports.scene,
      importsDom: imports.dom,
      isWrapper
    }
  })

  return {
    scene: entries.filter((entry) => entry.layer === 'scene'),
    dom: entries.filter((entry) => entry.layer === 'dom')
  }
}

export function splitEntries(entries: Entry[]): { wrappers: Entry[]; leaves: Entry[] } {
  return {
    wrappers: entries.filter((entry) => entry.isWrapper),
    leaves: entries.filter((entry) => !entry.isWrapper)
  }
}

export function entryIndex(entries: Entry[], filePath: string): number {
  const normalized = normalizePath(filePath)
  return entries.findIndex((entry) => normalizePath(entry.path) === normalized)
}

export function isDiscoveredEntry(graph: EntryGraph, filePath: string): boolean {
  return entryIndex([...graph.scene, ...graph.dom], filePath) !== -1
}

export function transformStartImports(
  source: string,
  options: {
    layer: Layer
    isWrapper: boolean
    sceneTarget: string
    domTarget: string
  }
): string {
  const importPattern =
    /import\s*\{([^}]+)\}\s*from\s*['"]@react-three\/start['"]\s*;?/g

  return source.replace(importPattern, (_full, specifiers: string) => {
    const names = specifiers
      .split(',')
      .map((part: string) => part.trim().split(/\s+as\s+/i)[0]?.trim())
      .filter(Boolean)

    const replacements: string[] = []

    if (names.includes('Scene')) {
      replacements.push(`import Scene from ${JSON.stringify(options.sceneTarget)};`)
    }

    if (names.includes('Dom')) {
      if (options.layer !== 'dom') {
        throw new Error('Dom can only be imported from discovered *.dom.tsx entry files.')
      }
      replacements.push(`import Dom from ${JSON.stringify(options.domTarget)};`)
    }

    return replacements.join('\n')
  })
}

export function createEntriesModuleCode(root: string, entries: Entry[]): string {
  const imports = entries
    .map((entry, index) => `import Entry${index} from ${JSON.stringify(toRootImport(root, entry.path))};`)
    .join('\n')
  const children = entries.map((_entry, index) => `jsx(Entry${index}, {})`).join(', ')

  return `${imports}
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

export default function Entries() {
  return jsxs(Fragment, { children: [${children}] });
}
`
}

export function createWrapperContinuationCode(
  root: string,
  wrappers: Entry[],
  leavesId: string,
  continuationPrefix: string,
  index: number
): string {
  if (index >= wrappers.length) {
    return `export { default } from ${JSON.stringify(leavesId)};\n`
  }

  const wrapper = wrappers[index]
  return `import Wrapper from ${JSON.stringify(toRootImport(root, wrapper.path))};
import { jsx } from 'react/jsx-runtime';

export default function Continuation() {
  return jsx(Wrapper, {});
}
`
}

export function createClientModuleCode(options: Required<StartOptions>): string {
  return `import { createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import Scene from '${VIRTUAL_PREFIX}/scene/0';
import Dom from '${VIRTUAL_PREFIX}/dom/0';

const rootElement = document.getElementById('root') ?? (() => {
  const element = document.createElement('div');
  element.id = 'root';
  document.body.appendChild(element);
  return element;
})();

rootElement.style.width = '100vw';
rootElement.style.height = '100vh';
document.body.style.margin = '0';

function StartApp() {
  return createElement(
    Fragment,
    null,
    ${
      options.injectCanvas
        ? `createElement(
      'div',
      { style: { position: 'fixed', inset: 0 } },
      createElement(Canvas, null, createElement(Scene))
    )`
        : 'null'
    },
    createElement(
      'div',
      { style: { position: 'fixed', inset: 0, pointerEvents: ${options.injectCanvas ? "'none'" : "'auto'"} } },
      createElement(Dom)
    )
  );
}

createRoot(rootElement).render(createElement(StartApp));
`
}

export function createHtmlInjectionTag(): string {
  return `<script type="module">import '${VIRTUAL_PREFIX}/client';</script>`
}

export function createHtmlDocument(title = 'react-three-start'): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="root"></div>
    ${createHtmlInjectionTag()}
  </body>
</html>
`
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function hasIndexHtml(root: string): boolean {
  return fs.existsSync(path.join(root, 'index.html'))
}

export function writeGeneratedHtml(root: string, title?: string): string {
  const dir = path.join(root, 'node_modules', '.react-three-start')
  const filePath = path.join(dir, 'index.html')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, createHtmlDocument(title), 'utf8')
  return filePath
}

export function virtualId(id: string): string {
  return `${VIRTUAL_PREFIX}/${id}`
}

export function resolvedVirtualId(id: string): string {
  return `${RESOLVED_PREFIX}/${id}`
}

export function stripResolvedVirtualId(id: string): string | null {
  if (!id.startsWith(`${RESOLVED_PREFIX}/`)) return null
  return id.slice(RESOLVED_PREFIX.length + 1)
}
