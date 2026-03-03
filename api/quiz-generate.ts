import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const QUIZ_COUNT = 20

const SYSTEM_PROMPT = `あなたは高度な教育専門家です。提供されたテキストに基づき、非常に難易度の高い4択クイズを必ず30問生成してください。30問ちょうど生成すること。
【難易度】非常に高い。文脈理解や論理的推論が必要。
【選択肢の長さルール（最重要・厳守）】
これは試験の公平性に関わる最も重要なルールです。
- 正解の選択肢が4つの中で最も長い問題は作成禁止。
- 必ず不正解の選択肢の中に正解より長いものを1つ以上含めること。
- 具体的には、不正解の選択肢に「〜だが、実際には〜である」「〜を考慮すると〜となる」のような補足や条件を付けて長くすること。
- 正解は簡潔・端的に記述すること。
【その他のルール】
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
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `以下のテキストから4択クイズを30問生成してください。重要: 正解の選択肢が最も長い問題は絶対に作らないでください。不正解の方を長くしてください。\n\n${truncatedText}` },
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

    // 正解が最長の問題を厳格に除外（「長いのを選べば正解」対策）
    const filtered = allQuestions.filter((q: any) => {
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) return false
      if (q.correctIndex < 0 || q.correctIndex > 3) return false
      const lengths = q.options.map((o: string) => (o || '').length)
      const correctLen = lengths[q.correctIndex]
      const maxLen = Math.max(...lengths)
      // 正解が最長なら除外（同率最長も除外）
      return correctLen < maxLen
    })

    const questions = filtered.slice(0, QUIZ_COUNT)
    if (questions.length < QUIZ_COUNT) {
      // 厳格フィルタで足りない場合、緩いフィルタで補充（正解が同率最長は許容）
      const loose = allQuestions.filter((q: any) => {
        if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) return false
        if (filtered.includes(q)) return false
        const lengths = q.options.map((o: string) => (o || '').length)
        const correctLen = lengths[q.correctIndex]
        const sorted = [...lengths].sort((a, b) => b - a)
        return correctLen <= sorted[0] && sorted.filter((l: number) => l === sorted[0]).length >= 2
      })
      questions.push(...loose.slice(0, QUIZ_COUNT - questions.length))
    }

    if (questions.length < QUIZ_COUNT) {
      return res.status(500).json({ error: `問題の生成数が不足しています（${questions.length}/${QUIZ_COUNT}問）` })
    }
    res.status(200).json({ questions })
  } catch (error: any) {
    console.error('Quiz generate error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
