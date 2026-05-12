import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import MagicString from 'magic-string'
import { normalizePath } from 'vite'
export type Layer = 'scene' | 'dom'

export type StartOptions = {
  injectCanvas?: boolean
  generateHtml?: boolean
  title?: string
}

export type Entry = {
  path: string
  layer: Layer
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

  for (const specifier of getStartImportSpecifiers(source)) {
    if (specifier.kind === 'type') continue

    result.scene ||= specifier.imported === 'Scene'
    result.dom ||= specifier.imported === 'Dom'
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
      path: filePath,
      layer,
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
  const normalized = normalizeComparablePath(filePath)
  return entries.findIndex((entry) => normalizeComparablePath(entry.path) === normalized)
}

export function transformStartImports(
  source: string,
  options: {
    layer: Layer
    sceneTarget: string
    domTarget: string
  }
): string {
  const ast = parseModule(source)
  const code = new MagicString(source)
  let changed = false

  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue
    if (node.source.value !== START_MODULE) continue
    if (node.importKind === 'type') continue

    let keptDefault: string | null = null
    let keptNamespace: string | null = null
    const keptNamed: string[] = []
    const replacements: string[] = []

    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        keptDefault = specifier.local.name
        continue
      }

      if (specifier.type === 'ImportNamespaceSpecifier') {
        keptNamespace = specifier.local.name
        continue
      }

      if (specifier.type !== 'ImportSpecifier') {
        continue
      }

      const imported = getImportedName(specifier.imported)
      const local = specifier.local.name

      if (specifier.importKind === 'type') {
        keptNamed.push(printImportSpecifier(specifier))
      } else if (imported === 'Scene') {
        replacements.push(`import ${local} from ${JSON.stringify(options.sceneTarget)};`)
      } else if (imported === 'Dom') {
        if (options.layer !== 'dom') {
          throw new Error('Dom can only be imported from discovered *.dom.tsx entry files.')
        }
        replacements.push(`import ${local} from ${JSON.stringify(options.domTarget)};`)
      } else {
        keptNamed.push(printImportSpecifier(specifier))
      }
    }

    if (replacements.length === 0) continue

    const keptImport = printKeptImport(keptDefault, keptNamespace, keptNamed)
    if (keptImport) replacements.push(keptImport)

    code.overwrite(node.start ?? 0, node.end ?? 0, replacements.join('\n'))
    changed = true
  }

  return changed ? code.toString() : source
}

function getStartImportSpecifiers(source: string): Array<{
  imported: string
  kind: 'type' | 'value'
}> {
  const ast = parseModule(source)
  const specifiers: Array<{ imported: string; kind: 'type' | 'value' }> = []

  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue
    if (node.source.value !== START_MODULE) continue
    if (node.importKind === 'type') continue

    for (const specifier of node.specifiers) {
      if (specifier.type !== 'ImportSpecifier') continue
      specifiers.push({
        imported: getImportedName(specifier.imported),
        kind: specifier.importKind === 'type' ? 'type' : 'value'
      })
    }
  }

  return specifiers
}

function parseModule(source: string) {
  return parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  })
}

function normalizeComparablePath(filePath: string): string {
  try {
    return normalizePath(fs.realpathSync.native(filePath))
  } catch {
    return normalizePath(path.resolve(filePath))
  }
}

function getImportedName(node: { type: string; name?: string; value?: string }): string {
  return node.type === 'Identifier' ? node.name ?? '' : node.value ?? ''
}

function printKeptImport(
  defaultSpecifier: string | null,
  namespaceSpecifier: string | null,
  namedSpecifiers: string[]
): string | null {
  const source = JSON.stringify(START_MODULE)

  if (namespaceSpecifier) {
    const head = defaultSpecifier ? `${defaultSpecifier}, ` : ''
    return `import ${head}* as ${namespaceSpecifier} from ${source};`
  }

  if (namedSpecifiers.length > 0) {
    const head = defaultSpecifier ? `${defaultSpecifier}, ` : ''
    return `import ${head}{ ${namedSpecifiers.join(', ')} } from ${source};`
  }

  if (defaultSpecifier) {
    return `import ${defaultSpecifier} from ${source};`
  }

  return null
}

function printImportSpecifier(specifier: {
  local?: { name: string }
  imported?: { type: string; name?: string; value?: string }
  importKind?: 'type' | 'typeof' | 'value' | null
}): string {
  const imported = specifier.imported ? getImportedName(specifier.imported) : ''
  const local = specifier.local?.name ?? imported
  const kind = specifier.importKind === 'type' ? 'type ' : ''
  return imported === local ? `${kind}${imported}` : `${kind}${imported} as ${local}`
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

export function stripResolvedVirtualId(id: string): string | null {
  if (!id.startsWith(`${RESOLVED_PREFIX}/`)) return null
  return id.slice(RESOLVED_PREFIX.length + 1)
}
