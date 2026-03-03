import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SYSTEM_PROMPT = `あなたは高度な教育専門家です。提供されたテキストに基づき、非常に難易度の高い4択クイズを21問生成してください。
【難易度】非常に高い。文脈理解や論理的推論が必要。
【選択肢のルール】
- 4つの選択肢はすべて同程度の長さ・詳しさにすること。正解だけが長い・詳しいのは禁止。
- 不正解の選択肢もテキストの内容に基づいたもっともらしいものにすること。
- correctIndexは0〜3の間でランダムに分散させること（特定の位置に偏らせない）。
【形式】JSON配列のみを返してください。マークダウンのコードブロックや説明文は不要です。
[{"question": "問題文", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "解説"}]`

// テキストを最大6000文字に切り詰め（約3000トークン相当）
const MAX_TEXT_LENGTH = 6000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const { text } = req.body
  if (!text) {
    return res.status(400).json({ error: 'text is required' })
  }

  const truncatedText = text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH) + '\n\n（以下省略）'
    : text

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `以下のテキストから4択クイズを21問生成してください。\n\n${truncatedText}` },
        { role: 'assistant', content: '[' },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const raw = '[' + (textBlock?.text || ']')

    // JSON部分を抽出
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse quiz questions' })
    }

    const questions = JSON.parse(jsonMatch[0]).slice(0, 20)
    if (questions.length < 15) {
      return res.status(500).json({ error: `問題の生成数が不足しています（${questions.length}問）` })
    }
    res.status(200).json({ questions })
  } catch (error: any) {
    console.error('Quiz generate error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
