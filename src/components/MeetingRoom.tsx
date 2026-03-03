import { useState, useEffect, useRef, useCallback } from 'react'
import type { AppConfig, ChatMessage } from '../types'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

interface Props {
  config: AppConfig
  onEnd: (messages: ChatMessage[]) => void
}

function convertToEmbedUrl(url: string): string {
  const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return url
  return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=60000`
}

function buildSystemPrompt(
  config: AppConfig,
  currentPage: number,
  questionsOnPage: number
): string {
  const isLastExchange = questionsOnPage >= 2
  const isLastPage = currentPage === config.totalPages

  const scenarioContext =
    config.scenario === 'sales'
      ? `あなたは企業の事業部長「田中太郎」です。営業担当者から商品・サービスの説明を受けています。
あなたの性格: 論理的で数字に厳しい。ROIを重視する。丁寧だが的確な質問をする。`
      : `あなたはクライアント企業のマーケティング部長「田中太郎」です。担当者から施策の報告を受けています。
あなたの性格: 成果に関心が高い。施策の効果と次のアクションを具体的に知りたがる。`

  const descriptionContext = config.description
    ? `\n\n【説明されている商品・サービスの概要】\n${config.description}`
    : ''

  let transitionInstruction = ''
  if (isLastPage && isLastExchange) {
    transitionInstruction =
      '\n- これが最後のページです。回答に対して簡潔にリアクションした後、「ありがとうございました。全体を通してよく理解できました。本日は貴重なお時間をいただきありがとうございます。」と締めくくってください。次のスライドは促さないでください。'
  } else if (isLastExchange) {
    transitionInstruction =
      '\n- このページの質疑は十分です。回答に対して簡潔にリアクションした後、「ありがとうございます。では、次のスライドをお願いできますか？」と言って次に進むよう促してください。'
  }

  return `${scenarioContext}${descriptionContext}

【ルール】
- 現在ページ ${currentPage} / ${config.totalPages} です
- このページでの質疑応答は ${questionsOnPage + 1} 回目です
- 質問は1回に1つだけ、2〜3文で簡潔に
- 日本語の敬語で自然に話してください
- 現実的でビジネスに即した質問をしてください
- 相手の説明に対してまず簡潔にリアクション（相槌・感想）してから質問してください${transitionInstruction}`
}

export function MeetingRoom({ config, onEnd }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [questionsOnPage, setQuestionsOnPage] = useState(0)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [waitingForNext, setWaitingForNext] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isAIThinking) return
      setError('')

      const userMessage: ChatMessage = {
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }

      const currentMessages = [...messagesRef.current, userMessage]
      setMessages(currentMessages)
      setIsAIThinking(true)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: buildSystemPrompt(
              config,
              currentPage,
              questionsOnPage
            ),
            messages: currentMessages.map(m => ({
              role: m.role === 'user' ? 'user' as const : 'assistant' as const,
              content: m.content,
            })),
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || 'API error')
        }

        const data = await response.json()

        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toISOString(),
        }

        setMessages(prev => [...prev, aiMessage])

        const newQCount = questionsOnPage + 1
        setQuestionsOnPage(newQCount)

        if (
          data.content.includes('次のスライド') ||
          data.content.includes('次のページ') ||
          data.content.includes('全体を通して') ||
          newQCount >= 3
        ) {
          setWaitingForNext(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました')
      } finally {
        setIsAIThinking(false)
      }
    },
    [config, currentPage, questionsOnPage, isAIThinking]
  )

  const { isListening, interimTranscript, startListening, stopListening } =
    useSpeechRecognition(handleSendMessage)

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAIThinking])

  // Initial greeting
  useEffect(() => {
    const greeting =
      config.scenario === 'sales'
        ? 'はじめまして、田中です。本日はお時間いただきありがとうございます。早速ですが、御社のサービスについてご説明いただけますか？'
        : 'お疲れ様です、田中です。それでは本日の報告をお願いいたします。'
    setMessages([
      { role: 'assistant', content: greeting, timestamp: new Date().toISOString() },
    ])
  }, [config.scenario])

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.trim()) {
      handleSendMessage(textInput.trim())
      setTextInput('')
    }
  }

  const handleNextPage = () => {
    if (currentPage < config.totalPages) {
      setCurrentPage(prev => prev + 1)
      setQuestionsOnPage(0)
      setWaitingForNext(false)
    }
  }

  const handleEnd = () => {
    onEnd(messages)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const embedUrl = convertToEmbedUrl(config.slidesUrl)
  const isLastPage = currentPage >= config.totalPages

  return (
    <div className="h-full flex flex-col bg-[#1a1a2e]">
      {/* Top bar */}
      <div className="h-11 bg-[#13132a] flex items-center justify-between px-4 border-b border-[#2d2d44] shrink-0">
        <div className="flex items-center gap-3">
          {isListening && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[11px] text-red-400 font-medium">REC</span>
            </span>
          )}
          <span className="text-sm font-medium text-gray-200">
            ロールプレイ練習
          </span>
        </div>
        <div className="text-xs text-gray-400 bg-[#1e1e3a] px-3 py-1 rounded-full">
          ページ {currentPage} / {config.totalPages}
        </div>
        <div className="text-xs text-gray-400 tabular-nums">
          {formatTime(elapsedTime)}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Slides area */}
        <div className="flex-1 p-3">
          <div className="w-full h-full rounded-xl overflow-hidden bg-black shadow-lg">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              title="Presentation"
            />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-64 flex flex-col gap-2 p-3 pl-0">
          {/* AI Client tile */}
          <div
            className={`flex-1 rounded-xl bg-[#2d2d44] flex flex-col items-center justify-center transition-all ${
              isAIThinking
                ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-[#1a1a2e]'
                : ''
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4a4a7a] to-[#3d3d5c] flex items-center justify-center text-2xl shadow-inner">
              👤
            </div>
            <div className="mt-2 text-white text-sm font-medium">田中太郎 様</div>
            <div className="text-gray-400 text-[11px]">
              {config.scenario === 'sales' ? '事業部長' : 'マーケティング部長'}
            </div>
            {isAIThinking && (
              <div className="mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>

          {/* User tile */}
          <div
            className={`flex-1 rounded-xl bg-[#2d2d44] flex flex-col items-center justify-center transition-all ${
              isListening
                ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-[#1a1a2e]'
                : ''
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4a4a7a] to-[#3d3d5c] flex items-center justify-center text-2xl shadow-inner">
              {isListening ? '🎙️' : '🧑‍💼'}
            </div>
            <div className="mt-2 text-white text-sm font-medium">あなた</div>
            {isListening && (
              <div className="mt-1 text-green-400 text-[11px] animate-pulse">
                発言中...
              </div>
            )}
            {interimTranscript && (
              <div className="mt-1 text-gray-300 text-[11px] px-3 text-center max-h-16 overflow-y-auto leading-relaxed">
                {interimTranscript}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="h-44 bg-[#13132a] border-t border-[#2d2d44] overflow-y-auto px-4 py-3 shrink-0">
        {messages.length <= 1 && !isAIThinking && (
          <div className="text-gray-500 text-xs text-center mt-6">
            {speechSupported
              ? 'マイクボタンを押して、スライドの説明を始めてください'
              : 'テキスト入力で説明を始めてください'}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-2.5 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`text-[10px] mb-0.5 ${
                  msg.role === 'user' ? 'text-blue-400' : 'text-green-400'
                }`}
              >
                {msg.role === 'user' ? 'あなた' : '田中様'}
              </div>
              <div
                className={`inline-block px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-[#2d2d44] text-gray-200 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isAIThinking && (
          <div className="mb-2.5">
            <div className="text-[10px] text-green-400 mb-0.5">田中様</div>
            <div className="inline-block px-3 py-2 rounded-xl rounded-tl-sm bg-[#2d2d44] text-gray-400 text-[13px]">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-red-400 text-xs bg-red-400/10 rounded px-3 py-1.5 mb-2">
            {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom controls */}
      <div className="h-16 bg-[#13132a] border-t border-[#2d2d44] flex items-center justify-center gap-3 px-4 shrink-0">
        {speechSupported ? (
          <button
            onClick={handleMicToggle}
            disabled={isAIThinking}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all text-lg ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 mic-pulse'
                : 'bg-[#3d3d5c] hover:bg-[#4d4d6c]'
            } ${isAIThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? '⏹' : '🎤'}
          </button>
        ) : (
          <form onSubmit={handleTextSubmit} className="flex gap-2 flex-1 max-w-md">
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="テキストで入力..."
              disabled={isAIThinking}
              className="flex-1 bg-[#2d2d44] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAIThinking || !textInput.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              送信
            </button>
          </form>
        )}

        {/* Text input as alternative even when speech is supported */}
        {speechSupported && !isListening && (
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="テキスト入力も可"
              disabled={isAIThinking}
              className="w-48 bg-[#2d2d44] text-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAIThinking || !textInput.trim()}
              className="px-3 py-2 bg-[#3d3d5c] hover:bg-[#4d4d6c] text-white rounded-lg text-xs disabled:opacity-50 transition-colors"
            >
              ↑
            </button>
          </form>
        )}

        {waitingForNext && !isLastPage && (
          <button
            onClick={handleNextPage}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all animate-pulse"
          >
            次のスライド →
          </button>
        )}

        {(waitingForNext && isLastPage) || (!waitingForNext && messages.length > 3) ? (
          <button
            onClick={handleEnd}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
          >
            {waitingForNext && isLastPage ? 'プレゼン終了' : '途中終了'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
