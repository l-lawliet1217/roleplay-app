import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_MODEL = 'gemini-2.5-flash'
const QUIZ_COUNT = 20

const SYSTEM_PROMPT = `あなたは高度な教育専門家です。提供されたテキストに基づき、非常に難易度の高い4択クイズを必ず30問生成してください。30問ちょうど生成すること。
【難易度】非常に高い。文脈理解や論理的推論が必要。
【選択肢のルール】
- 不正解の選択肢もテキストの内容に基づいたもっともらしいものにすること。
- 不正解にも具体的な数値・用語・条件を含め、正解と同程度の詳しさ・長さにすること。
- correctIndexは0〜3の間でランダムに分散させること。
【形式】JSON配列のみを返してください。マークダウンのコードブロックや説明文は不要です。
[{"question": "問題文", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "解説"}]`

// テキストを最大6000文字に切り詰め（約3000トークン相当）
const MAX_TEXT_LENGTH = 6000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' })
  }

  const { text } = req.body
  if (!text) {
    return res.status(400).json({ error: 'text is required' })
  }

  const truncatedText = text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH) + '\n\n（以下省略）'
    : text

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: `以下のテキストから4択クイズを30問生成してください。不正解の選択肢も正解と同程度の詳しさにしてください。\n\n${truncatedText}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 12000,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${body}`)
    }

    const data = await response.json()
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

    // コードブロック除去
    raw = raw.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '').trim()

    // JSON部分を抽出
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse quiz questions' })
    }

    const allQuestions = JSON.parse(jsonMatch[0])

    // バリデーション + 正解が極端に長い問題だけ除外
    const valid = allQuestions.filter((q: any) => {
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) return false
      if (q.correctIndex < 0 || q.correctIndex > 3) return false
      const lengths = q.options.map((o: string) => (o || '').length)
      const correctLen = lengths[q.correctIndex]
      const othersAvg = lengths.filter((_: number, i: number) => i !== q.correctIndex)
        .reduce((a: number, b: number) => a + b, 0) / 3
      // 正解が他の平均の1.5倍以上長い場合だけ除外
      if (othersAvg > 0 && correctLen / othersAvg > 1.5) return false
      return true
    })

    const questions = valid.slice(0, QUIZ_COUNT)
    if (questions.length < QUIZ_COUNT) {
      return res.status(500).json({ error: `問題の生成数が不足しています（${questions.length}/${QUIZ_COUNT}問）` })
    }
    res.status(200).json({ questions })
  } catch (error: any) {
    console.error('Quiz generate error:', error)
    res.status(500).json({ error: 'テストの生成に失敗しました。もう一度お試しください。' })
  }
}
