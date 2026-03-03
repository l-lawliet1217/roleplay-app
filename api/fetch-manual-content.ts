import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_ID = 'appxyLPPRXEEpdT6e'
const MANUAL_TABLE_ID = 'tblsfNw8YYBkWmaJM'

function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
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

  const pat = process.env.AIRTABLE_PAT
  if (!pat) {
    return res.status(500).json({ error: 'AIRTABLE_PAT is not configured' })
  }

  const manualRecordId = req.query.manualRecordId as string
  if (!manualRecordId) {
    return res.status(400).json({ error: 'manualRecordId is required' })
  }

  try {
    // 1. AirtableからManualレコードのTextUrlを取得
    const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${MANUAL_TABLE_ID}/${manualRecordId}`
    const atRes = await fetch(airtableUrl, {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (!atRes.ok) {
      throw new Error(`Airtable API error: ${atRes.status}`)
    }

    const record = await atRes.json()
    const textUrl = record.fields?.TextUrl
    const quizData = record.fields?.QuizData || null

    // QuizDataがあればキャッシュから返す
    if (quizData) {
      try {
        const questions = JSON.parse(quizData)
        return res.status(200).json({ cached: true, questions })
      } catch {
        // パース失敗時はキャッシュ無視して再生成
      }
    }

    if (!textUrl) {
      return res.status(404).json({ error: 'このマニュアルにはTextUrlが設定されていません' })
    }

    // 2. Google Docsからテキストをエクスポート（認証付き）
    const docId = extractDocId(textUrl)
    if (!docId) {
      return res.status(400).json({ error: 'Google Docs URLの解析に失敗しました' })
    }

    const accessToken = await getGoogleAccessToken()
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
    const docRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!docRes.ok) {
      throw new Error(`Google Docs fetch error: ${docRes.status}`)
    }

    const content = await docRes.text()

    if (!content || content.trim().length < 50) {
      return res.status(404).json({ error: 'マニュアルの内容が空または短すぎます' })
    }

    res.status(200).json({ cached: false, content })
  } catch (error: any) {
    console.error('Fetch manual content error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
