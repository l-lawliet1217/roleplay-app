import { useState } from 'react'
import type { AppConfig, ChatMessage, Scenario, AirtableSelect } from '../types'
import { MemberSelect } from '../components/MemberSelect'
import { SetupForm } from '../components/SetupForm'
import { MeetingRoom } from '../components/MeetingRoom'
import { ScoreCard } from '../components/ScoreCard'

type Screen = 'select' | 'setup' | 'meeting' | 'score'

interface Props {
  member: string | null
  watchId: string | null
}

export function PresentationFlow({ member, watchId }: Props) {
  const [screen, setScreen] = useState<Screen>('select')
  const [airtableSelect, setAirtableSelect] = useState<AirtableSelect>({
    memberId: '',
    watchId: '',
    completeCondition: null,
    manualRecordId: null,
    manualName: '',
  })
  const [config, setConfig] = useState<AppConfig>({
    scenario: 'sales',
    slidesUrl: '',
    totalPages: 5,
    description: '',
  })
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const handleMemberSelect = (memberId: string, watchId: string, completeCondition: string | null, manualRecordId: string | null, manualName: string, manualType: string | null, outputUrl: string | null) => {
    setAirtableSelect({ memberId, watchId, completeCondition, manualRecordId, manualName })
    const scenario: Scenario = manualType === '営業' ? 'sales' : 'report'
    setConfig(prev => ({ ...prev, scenario, slidesUrl: outputUrl || '' }))
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

      {screen === 'setup' && (
        <SetupForm
          config={config}
          onComplete={handleSetupComplete}
          onBack={() => setScreen('select')}
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
