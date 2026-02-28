import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { apiKey, systemPrompt, messages } = req.body

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' })
  }

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    res.status(200).json({ content: textBlock?.text || '' })
  } catch (error: any) {
    console.error('Chat API error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
