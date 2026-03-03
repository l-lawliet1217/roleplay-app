import { useRoute } from './hooks/useRoute'
import { TestFlow } from './flows/TestFlow'
import { PresentationFlow } from './flows/PresentationFlow'
import { HearingFlow } from './flows/HearingFlow'

function HomeScreen() {
  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold mb-3">AI Training Partner</h1>
        <p className="text-gray-400 text-sm mb-10">トレーニングの種類を選択してください</p>
        <div className="space-y-4">
          {[
            { href: '/presentation', label: 'プレゼン', desc: 'プレゼンテーションのロールプレイ' },
            { href: '/hearing', label: 'ヒアリング', desc: 'ヒアリングのロールプレイ' },
            { href: '/test', label: 'テスト', desc: 'マニュアル理解度テスト' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="block w-full p-5 rounded-xl bg-[#1e1e3a] border-2 border-[#2d2d5a] hover:border-blue-500 transition-colors text-left"
            >
              <div className="font-bold text-lg mb-1">{item.label}</div>
              <div className="text-gray-400 text-sm">{item.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { route, member, watchId } = useRoute()

  return (
    <div className="h-full">
      {route === 'home' && <HomeScreen />}
      {route === 'test' && <TestFlow member={member} watchId={watchId} />}
      {route === 'hearing' && <HearingFlow member={member} watchId={watchId} />}
      {route === 'presentation' && <PresentationFlow member={member} watchId={watchId} />}
    </div>
  )
}
