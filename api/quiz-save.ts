import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_ID = 'appxyLPPRXEEpdT6e'
const MANUAL_TABLE_ID = 'tblsfNw8YYBkWmaJM'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const pat = process.env.AIRTABLE_PAT
  if (!pat) {
    return res.status(500).json({ error: 'AIRTABLE_PAT is not configured' })
  }

  const { manualRecordId, questions } = req.body
  if (!manualRecordId || !questions) {
    return res.status(400).json({ error: 'manualRecordId and questions are required' })
  }

  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${MANUAL_TABLE_ID}/${manualRecordId}`
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: { QuizData: JSON.stringify(questions) },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.warn('Quiz save warning:', response.status, body)
      return res.status(200).json({ success: false, warning: body })
    }

    res.status(200).json({ success: true })
  } catch (error: any) {
    console.warn('Quiz save error:', error)
    res.status(200).json({ success: false, warning: error.message })
  }
}
