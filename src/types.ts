export interface BigFiveTraits {
  extroversion: number
  initiative: number
  agreeableness: number
  conscientiousness: number
}

export interface CognitiveConfig {
  w2: number
  w3: number
  lambda: number
  shock_threshold: number
  overload_threshold: number
}

export interface AgentPersona {
  id: string
  name: string
  raw_profile_text: string
  traits: BigFiveTraits
  cognitive_config: CognitiveConfig
  keywords: string[]
  domains: string[]
  friction_topics: string[]

  current_belief_summary: string
  current_belief_vector: number[]

  turns_since_last_speak: number
  accumulated_dissonance: number
  previous_dissonance: number
  current_curve: 'fading' | 'warming' | 'burst' | 'erratic'
  energy: number
}

export interface UtteranceMessage {
  id: string
  speakerId: string
  speakerName: string
  text: string
  inner_thoughts: string
  embedding?: number[]
  isHumanPerturbation?: boolean
}

export interface SimulationSnapshot {
  timestamp: number
  history: UtteranceMessage[]
  trackedDissonanceLog: Record<string, number[]>
}
