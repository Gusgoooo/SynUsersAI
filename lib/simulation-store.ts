import { create } from 'zustand'
import type { Locale } from '@/lib/locale'
import type {
  ActivatedMemory,
  PersonaCore,
  PersonaEvidence,
} from '@/lib/persona/types'

export type {
  ActivatedMemory,
  BiasProfile,
  EngagementCurve,
  MemoryProfile,
  OceanProfile,
  PersonaEvidence,
  TopicRelationProfile,
} from '@/lib/persona/types'

export interface SimAgent extends PersonaCore {
  energy: number
  turns_since_last_speak: number
  accumulated_dissonance: number
  currentEmotion: string
  emotionIntensity: number
}

export interface ImpulseScore {
  id: string
  name: string
  impulse: number
  cd: number
  ri: number
}

export interface ConvergenceSnapshot {
  turn: number
  min: number
  max: number
  median: number
  clusters: number
}

export interface CognitiveEvent {
  type: 'shock' | 'overload'
  agentName: string
  value: number
  round: number
}

export interface SimMessage {
  id: string
  speakerId: string
  speakerName: string
  text: string
  inner_thoughts: string
  usedEvidenceIds?: string[]
  evidence?: PersonaEvidence[]
  activatedMemories?: ActivatedMemory[]
  timestamp: number
}

export interface SimulationProgress {
  step: string
  label: string
  detail?: string
  timestamp: number
}

export interface EngineParams {
  moderatorInterval: number
  noiseRange: number
  silenceCompensation: number
  energyCostSpeaker: number
  energyCostListener: number
}

interface SimulationState {
  status: 'idle' | 'generating' | 'previewing' | 'running' | 'completed'
  config: { topic: string; topicContext?: string; mode: string; duration: number; model?: string; locale: Locale }
  agents: SimAgent[]
  messages: SimMessage[]
  streamingMessages: Map<string, SimMessage>
  progress: SimulationProgress | null
  impulseLog: ImpulseScore[][]
  convergenceLog: ConvergenceSnapshot[]
  cognitiveEvents: CognitiveEvent[]
  report: string | null
  engineParams: EngineParams
  setConfig: (config: { topic: string; topicContext?: string; mode: string; duration: number; model?: string; locale: Locale }) => void
  setStatus: (status: SimulationState['status']) => void
  setAgents: (agents: SimAgent[]) => void
  setProgress: (progress: Omit<SimulationProgress, 'timestamp'> | SimulationProgress | null) => void
  addMessage: (msg: SimMessage) => void
  startStreamMessage: (id: string, speakerId: string, speakerName: string, evidence?: PersonaEvidence[], usedEvidenceIds?: string[], activatedMemories?: ActivatedMemory[]) => void
  appendStreamChunk: (id: string, chunk: string) => void
  finalizeStreamMessage: (id: string, text: string, evidence?: PersonaEvidence[], usedEvidenceIds?: string[], activatedMemories?: ActivatedMemory[]) => void
  updateAgent: (id: string, updates: Partial<SimAgent>) => void
  addImpulseScores: (scores: ImpulseScore[]) => void
  addConvergenceSnapshot: (snapshot: ConvergenceSnapshot) => void
  addCognitiveEvent: (event: CognitiveEvent) => void
  setReport: (md: string) => void
  setEngineParams: (params: Partial<EngineParams>) => void
  reset: () => void
}

const DEFAULT_ENGINE_PARAMS: EngineParams = {
  moderatorInterval: 5,
  noiseRange: 80,
  silenceCompensation: 8,
  energyCostSpeaker: 3,
  energyCostListener: 1,
}

export const useSimulationStore = create<SimulationState>((set) => ({
  status: 'idle',
  config: { topic: '', mode: 'generated', duration: 60, locale: 'zh' },
  agents: [],
  messages: [],
  streamingMessages: new Map(),
  progress: null,
  impulseLog: [],
  convergenceLog: [],
  cognitiveEvents: [],
  report: null,
  engineParams: DEFAULT_ENGINE_PARAMS,
  setConfig: (config) => set({ config }),
  setStatus: (status) => set({ status }),
  setAgents: (agents) => set({ agents }),
  setProgress: (progress) => set({
    progress: progress ? { ...progress, timestamp: ('timestamp' in progress ? progress.timestamp : Date.now()) } : null,
  }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  startStreamMessage: (id, speakerId, speakerName, evidence, usedEvidenceIds, activatedMemories) =>
    set((s) => {
      const msg: SimMessage = { id, speakerId, speakerName, text: '', inner_thoughts: '', evidence, usedEvidenceIds, activatedMemories, timestamp: Date.now() }
      const newMap = new Map(s.streamingMessages)
      newMap.set(id, msg)
      return { streamingMessages: newMap, messages: [...s.messages, msg] }
    }),
  appendStreamChunk: (id, chunk) =>
    set((s) => {
      const newMap = new Map(s.streamingMessages)
      const existing = newMap.get(id)
      if (!existing) return {}
      const updated = { ...existing, text: existing.text + chunk }
      newMap.set(id, updated)
      return {
        streamingMessages: newMap,
        messages: s.messages.map(m => m.id === id ? updated : m),
      }
    }),
  finalizeStreamMessage: (id, text, evidence, usedEvidenceIds, activatedMemories) =>
    set((s) => {
      const newMap = new Map(s.streamingMessages)
      newMap.delete(id)
      return {
        streamingMessages: newMap,
        messages: s.messages.map(m => m.id === id ? { ...m, text, evidence: evidence ?? m.evidence, usedEvidenceIds: usedEvidenceIds ?? m.usedEvidenceIds, activatedMemories: activatedMemories ?? m.activatedMemories } : m),
      }
    }),
  updateAgent: (id, updates) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  addImpulseScores: (scores) =>
    set((s) => ({ impulseLog: [...s.impulseLog, scores] })),
  addConvergenceSnapshot: (snapshot) =>
    set((s) => ({ convergenceLog: [...s.convergenceLog, snapshot] })),
  addCognitiveEvent: (event) =>
    set((s) => ({ cognitiveEvents: [...s.cognitiveEvents, event] })),
  setReport: (report) => set({ report, status: 'completed', progress: null }),
  setEngineParams: (params) => set((s) => ({ engineParams: { ...s.engineParams, ...params } })),
  reset: () => set({ status: 'idle', agents: [], messages: [], streamingMessages: new Map(), progress: null, impulseLog: [], convergenceLog: [], cognitiveEvents: [], report: null, engineParams: DEFAULT_ENGINE_PARAMS }),
}))
