import type { VercelRequest, VercelResponse } from '@vercel/node'

function extractPresentationId(url: string): string | null {
  const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth credentials are not configured')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to refresh Google access token: ${error}`)
  }

  const data = await res.json()
  return data.access_token
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const url = req.query.url as string
  if (!url) {
    return res.status(400).json({ error: 'url is required' })
  }

  const presentationId = extractPresentationId(url)
  if (!presentationId) {
    return res.status(400).json({ error: 'Invalid Google Slides URL' })
  }

  try {
    const accessToken = await getGoogleAccessToken()
    const apiUrl = `https://slides.googleapis.com/v1/presentations/${presentationId}?fields=slides`
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Google Slides API error: ${response.status} ${body}`)
    }

    const data = await response.json()
    const pageCount = data.slides?.length ?? 0

    res.status(200).json({ pageCount })
  } catch (error: any) {
    console.error('Slides page count error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
