import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'

/**
 * Serves the newest Jev output JSON from a local folder at /api/jev/latest, so
 * the result page can show the latest run. If the folder has no JSON yet, it is
 * seeded with src/data/jev-seed.json. In dev, dropping a new file in the folder
 * pushes a `jev:update` event and the open result page refreshes itself.
 *
 * Folder: JEV_OUTPUT_DIR (default ./jev-output), relative to the project root.
 */
function localJev(): Plugin {
  let dir = ''
  let seed = ''

  function latest() {
    fs.mkdirSync(dir, { recursive: true })
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)

    for (const { f, t } of files) {
      try {
        const data: unknown = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
        return { file: f, modified: new Date(t).toISOString(), seeded: f === 'jev-seed.json', data }
      } catch {
        // Half-written or invalid file: fall through to the next newest.
      }
    }

    const name = 'jev-seed.json'
    fs.copyFileSync(seed, path.join(dir, name))
    return {
      file: name,
      modified: new Date(fs.statSync(path.join(dir, name)).mtimeMs).toISOString(),
      seeded: true,
      data: JSON.parse(fs.readFileSync(seed, 'utf8')) as unknown,
    }
  }

  const handler: Connect.NextHandleFunction = (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    try {
      res.end(JSON.stringify(latest()))
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  }

  return {
    name: 'local-jev',
    configResolved(config) {
      dir = path.resolve(config.root, process.env.JEV_OUTPUT_DIR ?? 'jev-output')
      seed = path.resolve(config.root, 'src/data/jev-seed.json')
    },
    configureServer(server) {
      server.middlewares.use('/api/jev/latest', handler)
      fs.mkdirSync(dir, { recursive: true })
      server.watcher.add(dir)
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(dir + path.sep) && file.endsWith('.json')) {
          server.ws.send({ type: 'custom', event: 'jev:update' })
        }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/jev/latest', handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localJev()],
})
