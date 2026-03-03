import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const QUIZ_COUNT = 20

const SYSTEM_PROMPT = `あなたは高度な教育専門家です。提供されたテキストに基づき、非常に難易度の高い4択クイズを必ず25問生成してください。25問ちょうど生成すること。
【難易度】非常に高い。文脈理解や論理的推論が必要。
【選択肢のルール（最重要）】
- 4つの選択肢の文字数を必ず揃えること。正解が最も長い問題は絶対に作らない。
- むしろ不正解の選択肢の方を長く詳しくし、正解は簡潔にするパターンも積極的に使うこと。
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
        { role: 'user', content: `以下のテキストから4択クイズを25問生成してください。\n\n${truncatedText}` },
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

    const allQuestions = JSON.parse(jsonMatch[0])

    // 正解が単独最長の問題を除外（「一番長いのを選べば正解」対策）
    // 正解が2番目以下の長さ → OK、正解が最長でも差が小さい → OK
    const filtered = allQuestions.filter((q: any) => {
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) return false
      const lengths = q.options.map((o: string) => (o || '').length)
      const maxLen = Math.max(...lengths)
      const correctLen = lengths[q.correctIndex]
      if (correctLen < maxLen) return true
      // 正解が最長でも、2番目との差が20%以内なら許容
      const sorted = [...lengths].sort((a, b) => b - a)
      if (sorted[1] > 0 && (maxLen - sorted[1]) / sorted[1] <= 0.2) return true
      return false
    })

    // フィルタ通過分が足りなければフィルタなしで補充
    const questions = filtered.length >= QUIZ_COUNT
      ? filtered.slice(0, QUIZ_COUNT)
      : [...filtered, ...allQuestions.filter((q: any) => !filtered.includes(q))].slice(0, QUIZ_COUNT)

    if (questions.length < QUIZ_COUNT) {
      return res.status(500).json({ error: `問題の生成数が不足しています（${questions.length}/${QUIZ_COUNT}問）` })
    }
    res.status(200).json({ questions })
  } catch (error: any) {
    console.error('Quiz generate error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
