import { useState, useEffect } from 'react'
import type { QuizQuestion, AirtableSelect } from '../types'

interface Props {
  questions: QuizQuestion[]
  answers: (number | null)[]
  airtableSelect: AirtableSelect
  onRestart: () => void
}

export function QuizResult({ questions, answers, airtableSelect, onRestart }: Props) {
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | 'skipped'>('saving')
  const [saveError, setSaveError] = useState('')

  const score = answers.filter((ans, i) => ans === questions[i].correctIndex).length
  const percentage = Math.round((score / questions.length) * 100)
  const passed = percentage >= 90

  useEffect(() => {
    console.log('QuizResult: airtableSelect =', JSON.stringify(airtableSelect), 'score =', percentage)
    if (!airtableSelect.watchId) {
      setSaveStatus('skipped')
      console.warn('watchId is empty, skipping score save')
      return
    }
    fetch('/api/airtable-save-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watchRecordId: airtableSelect.watchId,
        score: percentage,
      }),
    })
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `HTTP ${res.status}`)
        }
        setSaveStatus('saved')
      })
      .catch(err => {
        console.error('Airtable save error:', err)
        setSaveError(err.message || 'Unknown error')
        setSaveStatus('error')
      })
  }, [])

  return (
    <div className="min-h-full bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* スコア表示 */}
        <div className="text-center py-10">
          {airtableSelect.manualName && (
            <p className="text-gray-400 text-sm mb-4">{airtableSelect.manualName}</p>
          )}
          <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full mb-6 text-5xl font-black ${
            passed ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
          }`}>
            {percentage}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {score} / {questions.length} 正解
          </h1>
          <div className={`inline-block px-6 py-2 rounded-full font-bold text-sm ${
            passed ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
          }`}>
            {passed ? '合格' : '不合格'}
          </div>
          {saveStatus === 'saved' && (
            <p className="text-xs text-gray-500 mt-4">スコアをAirtableに保存しました</p>
          )}
          {saveStatus === 'error' && (
            <p className="text-xs text-red-400 mt-4">スコア保存に失敗: {saveError}</p>
          )}
          {saveStatus === 'skipped' && (
            <p className="text-xs text-yellow-400 mt-4">スコア保存スキップ（watchId未設定）</p>
          )}
          {saveStatus === 'saving' && (
            <p className="text-xs text-gray-500 mt-4">スコアを保存中...</p>
          )}
        </div>

        {/* 復習 */}
        <h2 className="text-xl font-bold">全問題の復習</h2>
        <div className="space-y-6">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctIndex
            return (
              <div key={i} className="p-6 rounded-xl bg-[#1e1e3a] border border-[#2d2d5a] space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-medium leading-relaxed">
                    <span className="text-gray-500 mr-2">問{i + 1}.</span>
                    {q.question}
                  </h3>
                  <span className={`text-lg flex-shrink-0 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {isCorrect ? '○' : '×'}
                  </span>
                </div>

                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`p-3 rounded-lg border text-sm ${
                        optIdx === q.correctIndex
                          ? 'border-green-500/30 bg-green-500/5 text-green-400'
                          : answers[i] === optIdx
                            ? 'border-red-500/30 bg-red-500/5 text-red-400'
                            : 'border-[#2d2d5a] text-gray-500'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>

                <div className="text-sm text-gray-400 bg-[#15152d] p-3 rounded-lg">
                  {q.explanation}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center py-6">
          <button
            onClick={onRestart}
            className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors"
          >
            最初に戻る
          </button>
        </div>
      </div>
    </div>
  )
}
