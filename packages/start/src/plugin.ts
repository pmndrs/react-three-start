import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import {
  START_MODULE,
  VIRTUAL_PREFIX,
  createClientModuleCode,
  createEntriesModuleCode,
  createSceneEntriesModuleCode,
  createHtmlDocument,
  createHtmlInjectionTag,
  createWrapperContinuationCode,
  entryIndex,
  hasIndexHtml,
  hasStartSlotImport,
  scanEntries,
  splitEntries,
  stripResolvedVirtualId,
  transformStartImports,
  type EntryGraph,
  type StartOptions
} from './core.js'

export type { StartOptions }

export function reactThreeStart(options: StartOptions = {}): Plugin {
  let config: ResolvedConfig
  let generatedIndexPath: string | null = null
  const resolvedOptions: Required<StartOptions> = {
    injectCanvas: options.injectCanvas ?? true,
    generateHtml: options.generateHtml ?? false,
    title: options.title ?? 'react-three-start'
  }

  const getGraph = (): EntryGraph => scanEntries(config.root)

  return {
    name: 'react-three-start',
    enforce: 'pre',

    config(userConfig, env) {
      const root = path.resolve(userConfig.root ?? process.cwd())
      if (!resolvedOptions.generateHtml || hasIndexHtml(root)) return null

      if (env.command === 'build') {
        generatedIndexPath = path.join(root, 'index.html')
        fs.writeFileSync(generatedIndexPath, createHtmlDocument(resolvedOptions.title), 'utf8')
      }

      return null
    },

    configResolved(resolved) {
      config = resolved
    },

    configureServer(server) {
      if (!resolvedOptions.generateHtml || hasIndexHtml(server.config.root)) return

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/' && url !== '/index.html') {
          next()
          return
        }

        try {
          const html = await server.transformIndexHtml(
            url,
            createHtmlDocument(resolvedOptions.title)
          )
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
        } catch (error) {
          next(error)
        }
      })
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) return `\0${id}`
      return null
    },

    load(id) {
      const virtual = stripResolvedVirtualId(id)
      if (!virtual) return null

      const graph = getGraph()
      const scene = splitEntries(graph.scene)
      const dom = splitEntries(graph.dom)

      if (virtual === 'client') {
        return createClientModuleCode(resolvedOptions)
      }

      if (virtual === 'scene/leaves') {
        return createSceneEntriesModuleCode(config.root, scene.leaves)
      }

      if (virtual === 'dom/leaves') {
        return createEntriesModuleCode(config.root, dom.leaves)
      }

      const sceneContinuation = virtual.match(/^scene\/(\d+)$/)
      if (sceneContinuation) {
        return createWrapperContinuationCode(
          config.root,
          scene.wrappers,
          `${VIRTUAL_PREFIX}/scene/leaves`,
          Number(sceneContinuation[1])
        )
      }

      const domContinuation = virtual.match(/^dom\/(\d+)$/)
      if (domContinuation) {
        return createWrapperContinuationCode(
          config.root,
          dom.wrappers,
          `${VIRTUAL_PREFIX}/dom/leaves`,
          Number(domContinuation[1])
        )
      }

      return null
    },

    transform(source, id) {
      if (!source.includes(START_MODULE)) return null

      const filePath = id.split('?')[0]
      if (!filePath || filePath.includes('/node_modules/')) return null

      if (!hasStartSlotImport(source)) return null

      const graph = getGraph()
      const allEntries = [...graph.scene, ...graph.dom]
      const entry = allEntries[entryIndex(allEntries, filePath)]
      if (!entry) {
        this.error(
          `Scene and Dom imports from ${START_MODULE} are only valid in discovered ` +
            `src/**/*.scene.tsx and src/**/*.dom.tsx entry files: ${path.relative(config.root, filePath)}`
        )
      }

      const sceneWrappers = splitEntries(graph.scene).wrappers
      const domWrappers = splitEntries(graph.dom).wrappers
      const sceneWrapperIndex = entryIndex(sceneWrappers, filePath)
      const domWrapperIndex = entryIndex(domWrappers, filePath)

      const sceneTarget =
        entry.layer === 'scene' && sceneWrapperIndex !== -1
          ? `${VIRTUAL_PREFIX}/scene/${sceneWrapperIndex + 1}`
          : `${VIRTUAL_PREFIX}/scene/0`

      const domTarget =
        entry.layer === 'dom' && domWrapperIndex !== -1
          ? `${VIRTUAL_PREFIX}/dom/${domWrapperIndex + 1}`
          : `${VIRTUAL_PREFIX}/dom/0`

      return {
        code: transformStartImports(source, {
          layer: entry.layer,
          sceneTarget,
          domTarget
        }),
        map: null
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (html.includes(`${VIRTUAL_PREFIX}/client`)) return html
        return html.replace('</body>', `${createHtmlInjectionTag()}\n</body>`)
      }
    },

    closeBundle() {
      if (!generatedIndexPath || !fs.existsSync(generatedIndexPath)) return

      const html = fs.readFileSync(generatedIndexPath, 'utf8')
      if (html.includes(VIRTUAL_PREFIX)) {
        fs.unlinkSync(generatedIndexPath)
      }
    }
  }
}

export default reactThreeStart
