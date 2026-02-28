import type { Scenario } from '../types'

interface Props {
  onSelect: (scenario: Scenario) => void
}

export function ScenarioSelect({ onSelect }: Props) {
  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">ロールプレイ練習</h1>
          <p className="text-gray-400 text-sm">
            プレゼンテーションの練習をAIクライアントと行います
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelect('sales')}
            className="group p-8 rounded-2xl bg-[#1e1e3a] border-2 border-[#2d2d5a] hover:border-blue-500 transition-all text-left"
          >
            <div className="text-4xl mb-4">💼</div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
              営業プレゼン
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              営業先に自社の商品・サービスを説明するシーンを想定したロールプレイです。クライアント役のAIが質問を投げかけます。
            </p>
            <div className="mt-4 text-xs text-gray-500">
              想定役割：事業部長（意思決定者）
            </div>
          </button>

          <button
            onClick={() => onSelect('report')}
            className="group p-8 rounded-2xl bg-[#1e1e3a] border-2 border-[#2d2d5a] hover:border-emerald-500 transition-all text-left"
          >
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
              報告プレゼン
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              クライアントへ施策の報告をするシーンを想定したロールプレイです。成果や次のアクションについて質問されます。
            </p>
            <div className="mt-4 text-xs text-gray-500">
              想定役割：マーケティング部長
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
