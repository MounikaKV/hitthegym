import fs from 'node:fs'
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import { QUESTIONS } from './src/data/questions.ts'

/**
 * Local bridge between the app and Jev (dev and preview servers only).
 *
 * GET  /api/jev/latest  Newest JSON in the output folder. Seeds the folder with
 *                       src/data/jev-seed.json if it has none. In dev, a change
 *                       in the folder pushes a `jev:update` event to the page.
 * POST /api/jev/run     Body: the day's state (the Review payload). Saves it to
 *                       the input folder for a local Jev script to pick up and,
 *                       if TYPESAFE_API_KEY is set, calls Jev directly and writes
 *                       `{ jev, day }` to the output folder.
 *
 * Folders: JEV_OUTPUT_DIR (default ./jev-output), JEV_INPUT_DIR (default ./jev-input).
 */
function localJev(env: Record<string, string>): Plugin {
  let outDir = ''
  let inDir = ''
  let seed = ''
  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')

  function latest() {
    fs.mkdirSync(outDir, { recursive: true })
    const files = fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(outDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)

    for (const { f, t } of files) {
      try {
        const data: unknown = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'))
        return { file: f, modified: new Date(t).toISOString(), seeded: f === 'jev-seed.json', data }
      } catch {
        // Half-written or invalid file: fall through to the next newest.
      }
    }

    const name = 'jev-seed.json'
    fs.copyFileSync(seed, path.join(outDir, name))
    return {
      file: name,
      modified: new Date(fs.statSync(path.join(outDir, name)).mtimeMs).toISOString(),
      seeded: true,
      data: JSON.parse(fs.readFileSync(seed, 'utf8')) as unknown,
    }
  }

  async function readBody(req: Connect.IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }

  async function run(day: unknown) {
    const id = stamp()
    fs.mkdirSync(inDir, { recursive: true })
    const input = JSON.stringify(day, null, 2)
    fs.writeFileSync(path.join(inDir, `${id}.json`), input)
    fs.writeFileSync(path.join(inDir, 'latest.json'), input)

    const key = env.TYPESAFE_API_KEY
    if (!key) return { status: 'waiting', input: `${path.basename(inDir)}/${id}.json` }

    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: day, model: 'jev-latest', questions: QUESTIONS }),
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`Jev returned ${res.status}: ${text.slice(0, 300)}`)
    const file = `run-${id}.json`
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, file), JSON.stringify({ jev: JSON.parse(text), day }, null, 2))
    return { status: 'done', output: `${path.basename(outDir)}/${file}` }
  }

  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(body))
  }

  const latestHandler: Connect.NextHandleFunction = (_req, res) => {
    try {
      json(res, 200, latest())
    } catch (err) {
      json(res, 500, { error: String(err) })
    }
  }

  const runHandler: Connect.NextHandleFunction = (req, res, next) => {
    if (req.method !== 'POST') return next()
    readBody(req)
      .then(run)
      .then((result) => json(res, 200, result))
      .catch((err: unknown) => json(res, 502, { error: err instanceof Error ? err.message : String(err) }))
  }

  return {
    name: 'local-jev',
    configResolved(config) {
      outDir = path.resolve(config.root, env.JEV_OUTPUT_DIR || 'jev-output')
      inDir = path.resolve(config.root, env.JEV_INPUT_DIR || 'jev-input')
      seed = path.resolve(config.root, 'src/data/jev-seed.json')
    },
    configureServer(server) {
      server.middlewares.use('/api/jev/latest', latestHandler)
      server.middlewares.use('/api/jev/run', runHandler)
      fs.mkdirSync(outDir, { recursive: true })
      server.watcher.add(outDir)
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(outDir + path.sep) && file.endsWith('.json')) {
          server.ws.send({ type: 'custom', event: 'jev:update' })
        }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/jev/latest', latestHandler)
      server.middlewares.use('/api/jev/run', runHandler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), localJev(loadEnv(mode, process.cwd(), ''))],
}))
