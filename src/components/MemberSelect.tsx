import { useState, useEffect } from 'react'
import type { AirtableMember, AirtableWatch } from '../types'

interface Props {
  onSelect: (memberId: string, watchId: string, completeCondition: string | null, manualRecordId: string | null) => void
}

export function MemberSelect({ onSelect }: Props) {
  const params = new URLSearchParams(window.location.search)
  const qMember = params.get('member') || ''
  const qWatchId = params.get('watchId') || ''

  const [members, setMembers] = useState<AirtableMember[]>([])
  const [watches, setWatches] = useState<AirtableWatch[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedWatchId, setSelectedWatchId] = useState('')
  const [loading, setLoading] = useState(true)
  const [watchLoading, setWatchLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoSelected, setAutoSelected] = useState(false)

  useEffect(() => {
    fetch('/api/airtable-members')
      .then(res => {
        if (!res.ok) throw new Error('メンバー情報の取得に失敗しました')
        return res.json()
      })
      .then(data => {
        setMembers(data.members)
        if (qMember) {
          const match = data.members.find((m: AirtableMember) => m.name === qMember)
          if (match) setSelectedMemberId(match.id)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedMemberId) {
      setWatches([])
      setSelectedWatchId('')
      return
    }
    setWatchLoading(true)
    setSelectedWatchId('')
    const member = members.find(m => m.id === selectedMemberId)
    if (!member) return
    fetch(`/api/airtable-watches?memberName=${encodeURIComponent(member.name)}`)
      .then(res => {
        if (!res.ok) throw new Error('視聴管理レコードの取得に失敗しました')
        return res.json()
      })
      .then(data => {
        setWatches(data.watches)
        if (qWatchId) {
          const match = data.watches.find((w: AirtableWatch) => w.id === qWatchId)
          if (match) setSelectedWatchId(match.id)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setWatchLoading(false))
  }, [selectedMemberId])

  const getSelectedWatch = () => watches.find(w => w.id === selectedWatchId)

  useEffect(() => {
    if (qMember && qWatchId && selectedMemberId && selectedWatchId && !autoSelected) {
      setAutoSelected(true)
      const w = getSelectedWatch()
      onSelect(selectedMemberId, selectedWatchId, w?.completeCondition ?? null, w?.manualRecordId ?? null)
    }
  }, [selectedMemberId, selectedWatchId])

  const handleStart = () => {
    if (selectedMemberId && selectedWatchId) {
      const w = getSelectedWatch()
      onSelect(selectedMemberId, selectedWatchId, w?.completeCondition ?? null, w?.manualRecordId ?? null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e]">
        <p className="text-gray-400 text-sm">メンバー情報を読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">トレーニング</h1>
          <p className="text-gray-400 text-sm">
            受講者とマニュアルを選択してください
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              メンバー
            </label>
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#1e1e3a] border-2 border-[#2d2d5a] focus:border-blue-500 outline-none text-white transition-colors"
            >
              <option value="">選択してください</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              マニュアル
            </label>
            {watchLoading ? (
              <p className="text-gray-500 text-sm p-3">読み込み中...</p>
            ) : (
              <select
                value={selectedWatchId}
                onChange={e => setSelectedWatchId(e.target.value)}
                disabled={!selectedMemberId}
                className="w-full p-3 rounded-xl bg-[#1e1e3a] border-2 border-[#2d2d5a] focus:border-blue-500 outline-none text-white transition-colors disabled:opacity-40"
              >
                <option value="">
                  {selectedMemberId ? '選択してください' : 'メンバーを先に選択'}
                </option>
                {watches.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.manualName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedWatchId && (() => {
            const w = getSelectedWatch()
            if (w?.completeCondition) {
              return (
                <div className="text-sm text-gray-400">
                  種別: <span className="text-white font-medium">{w.completeCondition}</span>
                </div>
              )
            }
            return null
          })()}

          <button
            onClick={handleStart}
            disabled={!selectedMemberId || !selectedWatchId}
            className="w-full p-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  )
}
