import { useState } from 'react'
import type { AppConfig, ChatMessage, Scenario, AirtableSelect } from '../types'
import { MemberSelect } from '../components/MemberSelect'
import { ScenarioSelect } from '../components/ScenarioSelect'
import { SetupForm } from '../components/SetupForm'
import { MeetingRoom } from '../components/MeetingRoom'
import { ScoreCard } from '../components/ScoreCard'

type Screen = 'select' | 'scenario' | 'setup' | 'meeting' | 'score'

interface Props {
  member: string | null
  watchId: string | null
}

export function PresentationFlow({ member, watchId }: Props) {
  const [screen, setScreen] = useState<Screen>(member && watchId ? 'scenario' : 'select')
  const [airtableSelect, setAirtableSelect] = useState<AirtableSelect>({
    memberId: '',
    watchId: '',
    completeCondition: null,
    manualRecordId: null,
  })
  const [config, setConfig] = useState<AppConfig>({
    scenario: 'sales',
    slidesUrl: '',
    totalPages: 5,
    description: '',
    apiKey: '',
  })
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const handleMemberSelect = (memberId: string, watchId: string, completeCondition: string | null, manualRecordId: string | null) => {
    setAirtableSelect({ memberId, watchId, completeCondition, manualRecordId })
    setScreen('scenario')
  }

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
    window.location.href = '/presentation'
  }

  return (
    <div className="h-full">
      {screen === 'select' && (
        <MemberSelect
          onSelect={handleMemberSelect}
          filterCondition="プレゼン"
          initialMember={member}
          initialWatchId={watchId}
        />
      )}

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
          airtableSelect={airtableSelect}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}
