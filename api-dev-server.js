// Local development server for API routes
// Run with: node api-dev-server.js
import { createServer } from 'http'

const PORT = 3000

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let body = ''
  for await (const chunk of req) body += chunk

  const parsedBody = JSON.parse(body)

  // Mock Vercel req/res
  const vercelReq = { method: req.method, body: parsedBody }
  const vercelRes = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this },
    json(data) { this._body = data },
  }

  try {
    let handler
    if (req.url === '/api/chat') {
      handler = (await import('./api/chat.ts')).default
    } else if (req.url === '/api/score') {
      handler = (await import('./api/score.ts')).default
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    await handler(vercelReq, vercelRes)

    res.writeHead(vercelRes._status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify(vercelRes._body))
  } catch (err) {
    console.error(err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}).listen(PORT, () => {
  console.log(`API dev server running on http://localhost:${PORT}`)
})
