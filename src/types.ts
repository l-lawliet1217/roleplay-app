export type Scenario = 'sales' | 'report'

export type AppScreen = 'scenario' | 'setup' | 'meeting' | 'score'

export interface AppConfig {
  scenario: Scenario
  slidesUrl: string
  totalPages: number
  description: string
  apiKey: string
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
