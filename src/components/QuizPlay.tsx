import { useState } from 'react'
import type { QuizQuestion } from '../types'

interface Props {
  questions: QuizQuestion[]
  onFinish: (answers: (number | null)[]) => void
}

export function QuizPlay({ questions, onFinish }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null))
  const [showFeedback, setShowFeedback] = useState(false)

  const q = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const selected = answers[currentIndex]

  const handleSelect = (idx: number) => {
    if (showFeedback) return
    const next = [...answers]
    next[currentIndex] = idx
    setAnswers(next)
    setShowFeedback(true)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowFeedback(false)
    } else {
      onFinish(answers)
    }
  }

  const optionStyle = (i: number) => {
    const base = 'p-4 rounded-xl border-2 transition-all text-left font-medium flex items-center gap-3 '
    if (showFeedback) {
      if (i === q.correctIndex) return base + 'border-green-500 bg-green-500/10 text-green-400'
      if (selected === i) return base + 'border-red-500 bg-red-500/10 text-red-400'
      return base + 'border-[#2d2d5a] opacity-40'
    }
    if (selected === i) return base + 'border-blue-500 bg-blue-500/10 text-blue-400'
    return base + 'border-[#2d2d5a] hover:border-[#4d4d7a] text-gray-300'
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
            問題 {currentIndex + 1}
          </span>
          <span className="text-xs text-gray-500">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <div className="h-1.5 bg-[#2d2d44] rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold leading-relaxed">{q.question}</h2>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={showFeedback}
                className={optionStyle(i)}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  selected === i ? 'bg-blue-500 text-white' : 'bg-[#2d2d5a] text-gray-500'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>

          {showFeedback && (
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-gray-300 text-sm leading-relaxed">
              {q.explanation}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNext}
              disabled={selected === null}
              className="px-8 py-3 bg-white text-[#0f0f23] rounded-xl font-bold transition-all hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {currentIndex === questions.length - 1 ? '結果を見る' : '次へ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
