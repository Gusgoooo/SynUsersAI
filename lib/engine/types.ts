export type {
  ActivatedMemory,
  AgentPersona,
  BiasProfile,
  EmotionState,
  EngagementCurve,
  MemoryProfile,
  OceanProfile,
  PersonaCore,
  PersonaEvidence,
} from '@/lib/persona/types'

import type { ActivatedMemory, PersonaEvidence } from '@/lib/persona/types'

export interface UtteranceMessage {
  id: string
  speakerId: string
  speakerName: string
  text: string
  inner_thoughts: string
  usedEvidenceIds?: string[]
  evidence?: PersonaEvidence[]
  activatedMemories?: ActivatedMemory[]
  embedding?: number[]
  isHumanPerturbation?: boolean
}

export interface SimulationSnapshot {
  timestamp: number
  history: UtteranceMessage[]
  trackedDissonanceLog: Record<string, number[]>
}
