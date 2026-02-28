import { useState, useEffect } from 'react'
import type { AppConfig, ChatMessage, ScoreResult } from '../types'

interface Props {
  messages: ChatMessage[]
  config: AppConfig
  onRestart: () => void
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 bg-[#2d2d44] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#3b82f6'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return '素晴らしい'
  if (score >= 80) return '良い'
  if (score >= 70) return 'まずまず'
  if (score >= 60) return '改善の余地あり'
  if (score >= 40) return '要改善'
  return '要練習'
}

export function ScoreCard({ messages, config, onRestart }: Props) {
  const [scores, setScores] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const conversationText = messages
          .map(
            m =>
              `${m.role === 'user' ? '【プレゼンター】' : '【クライアント・田中様】'}: ${m.content}`
          )
          .join('\n')

        const response = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: config.apiKey,
            conversation: conversationText,
            scenario: config.scenario,
          }),
        })

        if (!response.ok) throw new Error('Scoring failed')

        const data = await response.json()

        let parsed: ScoreResult
        try {
          parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content
        } catch {
          const jsonMatch = data.content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('Failed to parse score')
          }
        }

        setScores(parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : '採点に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [messages, config])

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e]">
        <div className="text-center">
          <div className="inline-flex gap-2 mb-4">
            <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
            <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
          </div>
          <p className="text-gray-400 text-sm">AIがプレゼンを採点しています...</p>
        </div>
      </div>
    )
  }

  if (error || !scores) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '採点結果の取得に失敗しました'}</p>
          <button
            onClick={onRestart}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            最初からやり直す
          </button>
        </div>
      </div>
    )
  }

  const overallScore = scores.scores.overall.score
  const overallColor = getScoreColor(overallScore)

  const categories = [
    scores.scores.explanation,
    scores.scores.qa,
    scores.scores.communication,
  ]

  return (
    <div className="min-h-full bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">ロールプレイ結果</h1>

        {/* Overall score */}
        <div className="bg-[#1e1e3a] rounded-2xl border border-[#2d2d5a] p-8 mb-6 text-center">
          <div className="text-gray-400 text-sm mb-2">総合スコア</div>
          <div
            className="text-6xl font-bold mb-2"
            style={{ color: overallColor }}
          >
            {overallScore}
          </div>
          <div className="text-gray-400 text-lg">/100</div>
          <div
            className="text-sm font-medium mt-2"
            style={{ color: overallColor }}
          >
            {getScoreLabel(overallScore)}
          </div>
          {scores.scores.overall.comment && (
            <p className="text-gray-400 text-sm mt-3">
              {scores.scores.overall.comment}
            </p>
          )}
        </div>

        {/* Category scores */}
        <div className="bg-[#1e1e3a] rounded-2xl border border-[#2d2d5a] p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">カテゴリ別スコア</h2>
          <div className="space-y-5">
            {categories.map((cat, i) => {
              const color = getScoreColor(cat.score)
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-200">{cat.label}</span>
                    <span className="text-sm font-bold" style={{ color }}>
                      {cat.score}
                    </span>
                  </div>
                  <ScoreBar score={cat.score} color={color} />
                  {cat.comment && (
                    <p className="text-[11px] text-gray-500 mt-1">{cat.comment}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1e1e3a] rounded-2xl border border-[#2d2d5a] p-6">
            <h2 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-green-400/20 rounded-full flex items-center justify-center text-[10px]">
                ✓
              </span>
              良かった点
            </h2>
            <ul className="space-y-2">
              {scores.strengths.map((s, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-green-400 shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#1e1e3a] rounded-2xl border border-[#2d2d5a] p-6">
            <h2 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-400/20 rounded-full flex items-center justify-center text-[10px]">
                !
              </span>
              改善点
            </h2>
            <ul className="space-y-2">
              {scores.improvements.map((s, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-amber-400 shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-[#1e1e3a] rounded-2xl border border-[#2d2d5a] p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">総評</h2>
          <p className="text-sm text-gray-300 leading-relaxed">{scores.summary}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pb-8">
          <button
            onClick={onRestart}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            もう一度練習する
          </button>
        </div>
      </div>
    </div>
  )
}
