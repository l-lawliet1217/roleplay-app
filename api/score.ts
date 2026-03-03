import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SCORING_SYSTEM_PROMPT = `あなたはプレゼンテーション・営業ロールプレイの評価の専門家です。
以下の会話ログを分析し、プレゼンターのパフォーマンスを評価してください。

評価基準:
- 説明のわかりやすさ: 論理的な構成、具体例の使用、専門用語の適切な使い方
- 質疑応答の的確さ: 質問への直接的な回答、根拠のある説明、追加情報の提供
- コミュニケーション力: 相手への配慮、自信のある話し方、適切な言葉遣い

必ず以下のJSON形式のみで回答してください。JSON以外のテキストは含めないでください。

{
  "scores": {
    "explanation": {
      "score": <1-100の整数>,
      "label": "説明のわかりやすさ",
      "comment": "<50文字以内のコメント>"
    },
    "qa": {
      "score": <1-100の整数>,
      "label": "質疑応答の的確さ",
      "comment": "<50文字以内のコメント>"
    },
    "communication": {
      "score": <1-100の整数>,
      "label": "コミュニケーション力",
      "comment": "<50文字以内のコメント>"
    },
    "overall": {
      "score": <1-100の整数>,
      "label": "総合評価",
      "comment": "<50文字以内のコメント>"
    }
  },
  "strengths": ["<良かった点1>", "<良かった点2>", "<良かった点3>"],
  "improvements": ["<改善点1>", "<改善点2>", "<改善点3>"],
  "summary": "<150文字以内の総評>"
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const { conversation, scenario } = req.body

  const scenarioContext =
    scenario === 'sales'
      ? '営業プレゼン（自社商品の説明）'
      : '報告プレゼン（クライアントへの施策報告）'

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SCORING_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `【シナリオ】${scenarioContext}\n\n【会話ログ】\n${conversation}`,
        },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    res.status(200).json({ content: textBlock?.text || '{}' })
  } catch (error: any) {
    console.error('Score API error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
