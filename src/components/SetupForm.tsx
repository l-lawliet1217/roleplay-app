import { useState } from 'react'
import type { AppConfig } from '../types'

interface Props {
  config: AppConfig
  onComplete: (updates: Partial<AppConfig>) => void
  onBack: () => void
}

export function SetupForm({ config, onComplete, onBack }: Props) {
  const [slidesUrl, setSlidesUrl] = useState(config.slidesUrl)
  const [totalPages, setTotalPages] = useState(config.totalPages)
  const [description, setDescription] = useState(config.description)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!slidesUrl.trim()) {
      setError('Google SlidesのURLを入力してください')
      return
    }
    if (!slidesUrl.includes('docs.google.com/presentation')) {
      setError('有効なGoogle SlidesのURLを入力してください')
      return
    }

    onComplete({ slidesUrl, totalPages, description })
  }

  const scenarioLabel = config.scenario === 'sales' ? '営業プレゼン' : '報告プレゼン'
  const descPlaceholder =
    config.scenario === 'sales'
      ? '例: クラウド勤怠管理システム「TimeFlow」。中小企業向けに月額500円/人で提供。打刻・シフト管理・有給管理が一元化できるのが強み。'
      : '例: SEO施策の月次報告。先月は記事を8本公開し、オーガニック流入が前月比15%増加。CVRは0.8%で推移。'

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
      <div className="max-w-lg w-full">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
        >
          ← マニュアル選択に戻る
        </button>

        <div className="bg-[#1e1e3a] rounded-2xl border border-[#2d2d5a] p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">
              {config.scenario === 'sales' ? '💼' : '📊'}
            </span>
            <div>
              <h2 className="text-xl font-bold">{scenarioLabel}</h2>
              <p className="text-gray-400 text-xs">
                ミーティングの設定を入力してください
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Google Slides URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={slidesUrl}
                onChange={e => setSlidesUrl(e.target.value)}
                placeholder="https://docs.google.com/presentation/d/..."
                className="w-full bg-[#12122a] border border-[#3d3d6a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                共有設定を「リンクを知っている全員が閲覧可」にしてください
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                スライド枚数
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={totalPages}
                onChange={e => setTotalPages(Number(e.target.value))}
                className="w-24 bg-[#12122a] border border-[#3d3d6a] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                商品・報告内容の概要
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={descPlaceholder}
                rows={3}
                className="w-full bg-[#12122a] border border-[#3d3d6a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                AIクライアントがより適切な質問をするための参考情報です
              </p>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              ミーティングを開始する
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
