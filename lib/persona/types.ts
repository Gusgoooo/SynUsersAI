export interface OceanProfile {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

export type EmotionState =
  | 'neutral'
  | 'curious'
  | 'irritated'
  | 'anxious'
  | 'excited'
  | 'defensive'
  | 'dismissive'
  | 'empathetic'

export interface BiasProfile {
  noveltyResistance: number
  authorityDeference: number
  lossAversion: number
  confirmationBias: number
  socialProof: number
  anchoring: number
}

export interface PersonaEvidence {
  evidenceId: string
  sourceName: string
  locator: string
  quote: string
  reason: string
  weight: number
}

export interface MemoryProfile {
  semanticMemory: string[]
  episodicCompositeMemory: string[]
  consumptionHabits: string[]
  educationCognitiveStyle: string
  socialIdentity: string
  emotionalTriggers: string[]
  languageRegister: string
  decisionHeuristics: string[]
}

export type TopicExposureLevel = 'unaware' | 'aware' | 'informed' | 'expert'
export type TopicResearchGrounding = 'web' | 'mixed' | 'user' | 'inferred'

export interface TopicRelationProfile {
  topic: string
  familiarity: number
  relevance: number
  exposureLevel: TopicExposureLevel
  relationSummary: string
  likelyKnownFacts: string[]
  likelyMisunderstandings: string[]
  decisionAngles: string[]
  visibleTraits: string[]
  privateInstruction: string
  researchGrounding: TopicResearchGrounding
}

export interface ActivatedMemory {
  label: string
  influence: string
  intensity: number
  sourceEvidenceIds?: string[]
}

export type EngagementCurve = 'steady' | 'fading' | 'warming' | 'burst' | 'erratic'

export interface PersonaCore {
  id: string
  name: string
  profileTitle?: string
  background: string
  personality: string
  stance: string
  speakingStyle: string
  knowledgeDomains: string[]
  triggerKeywords: string[]
  frictionTopics: string[]
  tags: string[]
  sourceSummary?: string
  dataGroundingScore?: number
  evidence?: PersonaEvidence[]
  memoryProfile?: MemoryProfile
  topicRelation?: TopicRelationProfile
  engagementCurve: EngagementCurve
  ocean: OceanProfile
  biases: BiasProfile
}

export interface AgentPersona extends PersonaCore {
  energy: number
  turns_since_last_speak: number
  accumulated_dissonance: number
  previous_dissonance: number
  current_belief_vector: number[]
  currentEmotion: EmotionState
  emotionIntensity: number
}
