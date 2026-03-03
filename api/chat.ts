import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_MODEL = 'gemini-2.5-flash'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' })
  }

  const { systemPrompt, messages } = req.body

  try {
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    )

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${body}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    res.status(200).json({ content: text })
  } catch (error: any) {
    console.error('Chat API error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
