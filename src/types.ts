// === Training Modes ===
export type TrainingMode = 'presentation' | 'hearing' | 'quiz'

// === Airtable ===
export interface AirtableMember {
  id: string
  name: string
  jobType: string
}

export interface AirtableWatch {
  id: string
  manualName: string
  score: number | null
  completeCondition: string | null
  manualRecordId: string | null
  manualType: string | null
  outputUrl: string | null
}

export interface AirtableSelect {
  memberId: string
  watchId: string
  completeCondition: string | null
  manualRecordId: string | null
  manualName: string
}

// === Screens ===
export type AppScreen =
  | 'member-select'
  | 'home'
  | 'scenario'
  | 'setup'
  | 'meeting'
  | 'score'
  | 'hearing-setup'
  | 'hearing-room'
  | 'hearing-score'
  | 'quiz-setup'
  | 'quiz-play'
  | 'quiz-result'

// === Presentation Mode ===
export type Scenario = 'sales' | 'report'

export interface AppConfig {
  scenario: Scenario
  slidesUrl: string
  totalPages: number
  description: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ScoreCategory {
  score: number
  label: string
  comment: string
}

export interface ScoreResult {
  scores: {
    explanation: ScoreCategory
    qa: ScoreCategory
    communication: ScoreCategory
    overall: ScoreCategory
  }
  strengths: string[]
  improvements: string[]
  summary: string
}

// === Hearing Mode ===
export type PersonalityType = 'analytical' | 'driver' | 'amiable' | 'expressive'

export interface PersonalityInfo {
  label: string
  description: string
}

export const PERSONALITIES: Record<PersonalityType, PersonalityInfo> = {
  analytical: {
    label: 'アナリティカル',
    description:
      '論理的な納得感を大切にする方。根拠のある質問には丁寧に答えてくれますが、唐突な質問には「なぜそれを聞くのですか？」と優しく理由を求めます。',
  },
  driver: {
    label: 'ドライバー',
    description:
      '効率と結果を重視する方。テキパキとした質問を好みます。「手短にお願いしますね」と言いつつ、的確な質問にはズバッと答えてくれます。',
  },
  amiable: {
    label: 'エミアブル',
    description:
      '穏やかで共感を大切にする方。話しやすい雰囲気を作ってくれますが、本音を引き出すには「安心感」を与える対話が必要です。',
  },
  expressive: {
    label: 'エクスプレッシブ',
    description:
      '明るく活発な方。話が盛り上がると楽しくお喋りしてくれますが、脱線しやすいので、上手く軌道修正しながらヒアリングする必要があります。',
  },
}

export interface HearingConfig {
  personality: PersonalityType
  persona: string
  product: string
  mandatoryItems: string
}

export interface HearingAchievedItem {
  item: string
  status: string
  reason: string
}

export interface HearingFeedbackItem {
  item: string
  reason: string
}

export interface HearingScoreResult {
  score: number
  achieved_items: HearingAchievedItem[]
  good_points: HearingFeedbackItem[]
  growth_tips: HearingFeedbackItem[]
  feedback: string
}

// === Quiz Mode ===
export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}
