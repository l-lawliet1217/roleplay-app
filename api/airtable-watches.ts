import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_ID = 'appxyLPPRXEEpdT6e'
const WATCH_TABLE_ID = 'tblsBlxV4g6GLNxn2'
const CATEGORY_TABLE_ID = 'tblsXTuX5A8GOpuBc'

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
    // マニュアルカテゴリテーブルから Type マッピングを取得
    const catFields = ['ManualCategoryName', 'Type'].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&')
    const catUrl = `https://api.airtable.com/v0/${BASE_ID}/${CATEGORY_TABLE_ID}?${catFields}`
    const catRes = await fetch(catUrl, { headers: { Authorization: `Bearer ${pat}` } })
    const catData = await catRes.json()
    const categoryTypeMap: Record<string, string> = {}
    for (const r of catData.records || []) {
      if (r.fields.Type) categoryTypeMap[r.id] = r.fields.Type
    }

    const filter = encodeURIComponent(`FIND("${memberName}", ARRAYJOIN({FullNameFromMember}))`)
    const fields = ['FullNameFromMember', 'ManualNameFromManual', 'TestScore', 'CompletionConditionsByManual', 'RecordIDByManual', 'ManualCategoryFromManual', 'OutputUrlFromManual']
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
    const watches = data.records.map((r: any) => {
      const catIds: string[] = r.fields.ManualCategoryFromManual || []
      const manualType = catIds.length > 0 ? (categoryTypeMap[catIds[0]] || null) : null
      return {
        id: r.id,
        manualName: (r.fields.ManualNameFromManual || ['(名称なし)'])[0],
        score: r.fields.TestScore ?? null,
        completeCondition: (r.fields.CompletionConditionsByManual || [null])[0] ?? null,
        manualRecordId: (r.fields.RecordIDByManual || [null])[0] ?? null,
        manualType,
        outputUrl: (r.fields.OutputUrlFromManual || [null])[0] ?? null,
      }
    })

    res.status(200).json({ watches })
  } catch (error: any) {
    console.error('Airtable watches error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
