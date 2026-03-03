import { useState } from 'react'
import type { AirtableSelect } from '../types'
import { MemberSelect } from '../components/MemberSelect'

type Screen = 'select' | 'coming-soon'

interface Props {
  member: string | null
  watchId: string | null
}

export function HearingFlow({ member, watchId }: Props) {
  const [screen, setScreen] = useState<Screen>('select')
  const [, setAirtableSelect] = useState<AirtableSelect>({
    memberId: '',
    watchId: '',
    completeCondition: null,
    manualRecordId: null,
    manualName: '',
  })

  const handleMemberSelect = (memberId: string, watchId: string, completeCondition: string | null, manualRecordId: string | null, manualName: string) => {
    setAirtableSelect({ memberId, watchId, completeCondition, manualRecordId, manualName })
    setScreen('coming-soon')
  }

  return (
    <div className="h-full">
      {screen === 'select' && (
        <MemberSelect
          onSelect={handleMemberSelect}
          filterCondition="ヒアリング"
          initialMember={member}
          initialWatchId={watchId}
        />
      )}

      {screen === 'coming-soon' && (
        <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
          <div className="max-w-lg w-full text-center space-y-6">
            <h2 className="text-2xl font-bold">ヒアリング</h2>
            <p className="text-gray-400">準備中です</p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors"
            >
              ホームに戻る
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
