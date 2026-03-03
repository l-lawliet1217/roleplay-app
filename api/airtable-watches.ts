import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_ID = 'appxyLPPRXEEpdT6e'
const WATCH_TABLE_ID = 'tblsBlxV4g6GLNxn2'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const pat = process.env.AIRTABLE_PAT
  if (!pat) {
    return res.status(500).json({ error: 'AIRTABLE_PAT is not configured' })
  }

  const memberName = req.query.memberName as string
  if (!memberName) {
    return res.status(400).json({ error: 'memberName is required' })
  }

  try {
    const filter = encodeURIComponent(`FIND("${memberName}", ARRAYJOIN({FullNameFromMember}))`)
    const fields = ['FullNameFromMember', 'ManualNameFromManual', 'TestScore', 'CompletionConditionsByManual', 'RecordIDByManual']
      .map(f => `fields%5B%5D=${encodeURIComponent(f)}`)
      .join('&')
    const url = `https://api.airtable.com/v0/${BASE_ID}/${WATCH_TABLE_ID}?filterByFormula=${filter}&${fields}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Airtable API error: ${response.status} ${body}`)
    }

    const data = await response.json()
    const watches = data.records.map((r: any) => ({
      id: r.id,
      manualName: (r.fields.ManualNameFromManual || ['(名称なし)'])[0],
      score: r.fields.TestScore ?? null,
      completeCondition: (r.fields.CompletionConditionsByManual || [null])[0] ?? null,
      manualRecordId: (r.fields.RecordIDByManual || [null])[0] ?? null,
    }))

    res.status(200).json({ watches })
  } catch (error: any) {
    console.error('Airtable watches error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
