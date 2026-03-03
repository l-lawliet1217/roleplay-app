import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const QUIZ_COUNT = 20

const SYSTEM_PROMPT = `あなたは高度な教育専門家です。提供されたテキストに基づき、非常に難易度の高い4択クイズを必ず30問生成してください。30問ちょうど生成すること。
【難易度】非常に高い。文脈理解や論理的推論が必要。
【選択肢の長さルール（最重要・厳守）】
試験の公平性に関わる最も重要なルールです。選択肢の長さから正解を推測できてはいけません。
- 4つの選択肢はすべて同程度の文字数にすること（差は10文字以内が理想）。
- どうしても長さに差が出る場合は、長い選択肢・短い選択肢のどちらにも正解と不正解を均等に配置すること。
- 不正解の選択肢にも具体的な数値・用語・条件を含め、正解と同程度の詳しさにすること。
【その他のルール】
- 不正解の選択肢もテキストの内容に基づいたもっともらしいものにすること。
- correctIndexは0〜3の間でランダムに分散させること。
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
        { role: 'user', content: `以下のテキストから4択クイズを30問生成してください。重要: 4つの選択肢の文字数を揃えてください。正解だけが長い・短いなど、長さから正解を推測できる問題は作らないでください。\n\n${truncatedText}` },
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

    // 選択肢の長さバイアスを排除するフィルタ
    // 正解が単独最長でも単独最短でもない問題を優先
    const valid = allQuestions.filter((q: any) => {
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) return false
      if (q.correctIndex < 0 || q.correctIndex > 3) return false
      return true
    })

    // スコア計算: 正解の長さ順位が中間に近いほど高スコア
    const scored = valid.map((q: any) => {
      const lengths = q.options.map((o: string) => (o || '').length)
      const correctLen = lengths[q.correctIndex]
      const sorted = [...lengths].sort((a, b) => b - a)
      const rank = sorted.indexOf(correctLen) // 0=最長, 3=最短
      // 中間（1位or2位）が最良、最長・最短がペナルティ
      const score = (rank === 1 || rank === 2) ? 2 : 0
      // 選択肢間の長さのばらつきが小さいほどボーナス
      const avg = lengths.reduce((a: number, b: number) => a + b, 0) / 4
      const variance = lengths.reduce((s: number, l: number) => s + (l - avg) ** 2, 0) / 4
      const uniformity = variance < 100 ? 1 : 0 // 標準偏差10文字以内ならボーナス
      return { q, score: score + uniformity }
    })

    // スコア順にソートして上位を採用
    scored.sort((a: any, b: any) => b.score - a.score)
    const questions = scored.slice(0, QUIZ_COUNT).map((s: any) => s.q)

    if (questions.length < QUIZ_COUNT) {
      return res.status(500).json({ error: `問題の生成数が不足しています（${questions.length}/${QUIZ_COUNT}問）` })
    }
    res.status(200).json({ questions })
  } catch (error: any) {
    console.error('Quiz generate error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
