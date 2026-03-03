import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_ID = 'appxyLPPRXEEpdT6e'
const WATCH_TABLE_ID = 'tblsBlxV4g6GLNxn2'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const pat = process.env.AIRTABLE_PAT
  if (!pat) {
    return res.status(500).json({ error: 'AIRTABLE_PAT is not configured' })
  }

  const { watchRecordId, score } = req.body
  if (!watchRecordId || score == null) {
    return res.status(400).json({ error: 'watchRecordId and score are required' })
  }

  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${WATCH_TABLE_ID}/${watchRecordId}`

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: { TestScore: score },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('Airtable save-score error:', response.status, body)
      return res.status(502).json({ error: `Airtable API error: ${response.status}`, detail: body })
    }

    res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Airtable save-score error:', error)
    res.status(500).json({ error: error.message })
  }
}
