import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_ID = 'appxyLPPRXEEpdT6e'
const MEMBER_TABLE_ID = 'tblYKmd6OQrdJPYR4'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const pat = process.env.AIRTABLE_PAT
  if (!pat) {
    return res.status(500).json({ error: 'AIRTABLE_PAT is not configured' })
  }

  try {
    const params = new URLSearchParams({
      filterByFormula: 'Resignation=FALSE()',
      'fields[]': 'FullName',
      sort: encodeURIComponent('[{"field":"FullName","direction":"asc"}]'),
    })

    // sort needs special handling
    const url = `https://api.airtable.com/v0/${BASE_ID}/${MEMBER_TABLE_ID}?filterByFormula=${encodeURIComponent('Resignation=FALSE()')}&fields%5B%5D=FullName&sort%5B0%5D%5Bfield%5D=FullName&sort%5B0%5D%5Bdirection%5D=asc`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`)
    }

    const data = await response.json()
    const members = data.records.map((r: any) => ({
      id: r.id,
      name: r.fields.FullName || '',
    }))

    res.status(200).json({ members })
  } catch (error: any) {
    console.error('Airtable members error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
