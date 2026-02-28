import { useState } from 'react'
import type { AppScreen, AppConfig, ChatMessage, Scenario } from './types'
import { ScenarioSelect } from './components/ScenarioSelect'
import { SetupForm } from './components/SetupForm'
import { MeetingRoom } from './components/MeetingRoom'
import { ScoreCard } from './components/ScoreCard'

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('scenario')
  const [config, setConfig] = useState<AppConfig>({
    scenario: 'sales',
    slidesUrl: '',
    totalPages: 5,
    description: '',
    apiKey: '',
  })
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const handleScenarioSelect = (scenario: Scenario) => {
    setConfig(prev => ({ ...prev, scenario }))
    setScreen('setup')
  }

  const handleSetupComplete = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
    setScreen('meeting')
  }

  const handleMeetingEnd = (chatMessages: ChatMessage[]) => {
    setMessages(chatMessages)
    setScreen('score')
  }

  const handleRestart = () => {
    setMessages([])
    setScreen('scenario')
  }

  return (
    <div className="h-full">
      {screen === 'scenario' && (
        <ScenarioSelect onSelect={handleScenarioSelect} />
      )}
      {screen === 'setup' && (
        <SetupForm
          config={config}
          onComplete={handleSetupComplete}
          onBack={() => setScreen('scenario')}
        />
      )}
      {screen === 'meeting' && (
        <MeetingRoom config={config} onEnd={handleMeetingEnd} />
      )}
      {screen === 'score' && (
        <ScoreCard
          messages={messages}
          config={config}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}
