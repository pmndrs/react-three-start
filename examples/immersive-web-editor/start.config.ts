import editorPlugin from 'immersive-web-editor'

export default {
  injectCanvas: false,
  title: 'react-three-start Immersive Web Editor',
  vite: {
    plugins: [editorPlugin()],
    optimizeDeps: {
      noDiscovery: true,
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@react-three/fiber',
        'three',
        'immersive-web-editor',
        '@immersive-web-editor/adapter',
        'use-sync-external-store/shim/with-selector.js'
      ]
    }
  }
}
