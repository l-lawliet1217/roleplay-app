import { useState } from 'react'

interface Props {
  manualName: string
  onGenerate: (text: string) => void
  onBack: () => void
}

export function QuizSetup({ manualName, onGenerate, onBack }: Props) {
  const [text, setText] = useState('')

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">テスト</h1>
          <p className="text-gray-400 text-sm">{manualName}</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              マニュアルの内容を貼り付けてください
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={12}
              className="w-full p-4 rounded-xl bg-[#1e1e3a] border-2 border-[#2d2d5a] focus:border-blue-500 outline-none text-white transition-colors resize-none"
              placeholder="マニュアルのテキストをここに貼り付け..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl border-2 border-[#2d2d5a] text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            >
              戻る
            </button>
            <button
              onClick={() => onGenerate(text)}
              disabled={!text.trim()}
              className="flex-1 p-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              20問のテストを生成
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
