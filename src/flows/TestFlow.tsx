import { useState } from 'react'
import type { AirtableSelect, QuizQuestion } from '../types'
import { MemberSelect } from '../components/MemberSelect'
import { QuizSetup } from '../components/QuizSetup'
import { QuizPlay } from '../components/QuizPlay'
import { QuizResult } from '../components/QuizResult'

type Screen = 'select' | 'quiz-setup' | 'quiz-play' | 'quiz-result'

interface Props {
  member: string | null
  watchId: string | null
}

export function TestFlow({ member, watchId }: Props) {
  const [screen, setScreen] = useState<Screen>(member && watchId ? 'quiz-setup' : 'select')
  const [airtableSelect, setAirtableSelect] = useState<AirtableSelect>({
    memberId: '',
    watchId: '',
    completeCondition: null,
    manualRecordId: null,
  })
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState('')

  const handleMemberSelect = (memberId: string, watchId: string, completeCondition: string | null, manualRecordId: string | null) => {
    setAirtableSelect({ memberId, watchId, completeCondition, manualRecordId })
    if (manualRecordId) {
      autoGenerateQuiz(manualRecordId)
    } else {
      setScreen('quiz-setup')
    }
  }

  const autoGenerateQuiz = async (manualRecordId: string) => {
    setQuizLoading(true)
    setQuizError('')
    setScreen('quiz-setup')

    try {
      const contentRes = await fetch(`/api/fetch-manual-content?manualRecordId=${encodeURIComponent(manualRecordId)}`)
      if (!contentRes.ok) {
        const err = await contentRes.json().catch(() => ({}))
        throw new Error(err.error || 'マニュアル内容の取得に失敗しました')
      }
      const contentData = await contentRes.json()

      if (contentData.cached && contentData.questions) {
        setQuizQuestions(contentData.questions)
        setScreen('quiz-play')
        return
      }

      const quizRes = await fetch('/api/quiz-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentData.content }),
      })
      if (!quizRes.ok) {
        const err = await quizRes.json().catch(() => ({}))
        throw new Error(err.error || 'テスト生成に失敗しました')
      }
      const data = await quizRes.json()
      setQuizQuestions(data.questions)
      setScreen('quiz-play')

      fetch('/api/quiz-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualRecordId, questions: data.questions }),
      }).catch(() => {})
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setQuizLoading(false)
    }
  }

  const handleQuizGenerate = async (text: string) => {
    setQuizLoading(true)
    setQuizError('')
    setScreen('quiz-setup')

    try {
      const res = await fetch('/api/quiz-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'テスト生成に失敗しました')
      setQuizQuestions(data.questions)
      setScreen('quiz-play')
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setQuizLoading(false)
    }
  }

  const handleQuizFinish = (answers: (number | null)[]) => {
    setQuizAnswers(answers)
    setScreen('quiz-result')
  }

  const handleRestart = () => {
    window.location.href = '/test'
  }

  return (
    <div className="h-full">
      {screen === 'select' && (
        <MemberSelect
          onSelect={handleMemberSelect}
          filterCondition="テスト"
          initialMember={member}
          initialWatchId={watchId}
        />
      )}

      {screen === 'quiz-setup' && (
        quizLoading ? (
          <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e]">
            <div className="text-center">
              <div className="inline-flex gap-2 mb-4">
                <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
              <p className="text-gray-400 text-sm">AIが20問のテストを生成しています...</p>
            </div>
          </div>
        ) : (
          <>
            {quizError && (
              <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
                <div className="max-w-lg w-full text-center space-y-4">
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {quizError}
                  </div>
                  <button onClick={handleRestart} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors">
                    戻る
                  </button>
                </div>
              </div>
            )}
            {!quizError && (
              <QuizSetup
                manualName=""
                onGenerate={handleQuizGenerate}
                onBack={() => setScreen('select')}
              />
            )}
          </>
        )
      )}

      {screen === 'quiz-play' && quizQuestions.length > 0 && (
        <QuizPlay questions={quizQuestions} onFinish={handleQuizFinish} />
      )}

      {screen === 'quiz-result' && quizQuestions.length > 0 && (
        <QuizResult
          questions={quizQuestions}
          answers={quizAnswers}
          airtableSelect={airtableSelect}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}
