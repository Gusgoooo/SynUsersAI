import { create } from 'zustand'
import type { ConceptAttributes, PersonaMetrics, AcceptanceScores } from '@/lib/engine/acceptance-model'

export interface ConceptAttribute {
  id: string
  key: string
  value: string
}

export interface Concept {
  id: string
  name: string
  description: string
  attributes: ConceptAttribute[]
}

export interface Segment {
  id: string
  name: string
  description: string
}

export interface ABTestPersona {
  id: string
  name: string
  background: string
  personality: string
  currentSolution: string
  monthlyBudget: string
  decisionStyle: string
  painPoints: string[]
  tags: string[]
  ocean: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number }
  biases: { noveltyResistance: number; authorityDeference: number; lossAversion: number; confirmationBias: number; socialProof: number; anchoring: number }
}

export interface EvaluationResult {
  personaId: string
  personaName: string
  conceptId: string
  segmentId: string
  acceptance: AcceptanceScores
  dimensionScores: Record<string, { score: number; reason: string }>
  attitude: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no'
  attitudeReason: string
  firstImpression: string
}

export interface ForcedChoiceResult {
  personaId: string
  personaName: string
  segmentId: string
  chosenConceptId: string
  reasoning: string
  rejectionReasons: Record<string, string>
}

export interface AggregateResult {
  segmentId: string
  conceptId: string
  mean: AcceptanceScores
  adoptionRate: number
  npsScore: number
  segmentFit: number
}

export interface ABTestProgress {
  phase: 'attributes' | 'personas' | 'eval' | 'choice'
  label?: string
  detail?: string
  segmentName?: string
  conceptName?: string
  current: number
  total: number
}

export interface EvalConfig {
  scenario: string
  customScenario: string
  decisionCriteria: string
  hypothesis: string
  protocol: 'sequential' | 'monadic'
}

interface ABTestState {
  status: 'idle' | 'running' | 'completed'
  concepts: Concept[]
  segments: Segment[]
  dimensions: string[]
  model: string
  agentCount: number
  evalConfig: EvalConfig
  conceptAttributes: Record<string, ConceptAttributes>
  personaMetrics: Record<string, Record<string, PersonaMetrics>>
  personas: Record<string, ABTestPersona[]>
  results: EvaluationResult[]
  aggregates: AggregateResult[]
  forcedChoices: ForcedChoiceResult[]
  progress: ABTestProgress | null

  setConcepts: (concepts: Concept[]) => void
  setSegments: (segments: Segment[]) => void
  setDimensions: (dimensions: string[]) => void
  setModel: (model: string) => void
  setAgentCount: (count: number) => void
  setEvalConfig: (config: EvalConfig) => void
  setStatus: (status: ABTestState['status']) => void
  setProgress: (progress: ABTestProgress | null) => void
  setConceptAttributes: (attrs: Record<string, ConceptAttributes>) => void
  setPersonaMetrics: (segmentId: string, metrics: Record<string, PersonaMetrics>) => void
  addPersonas: (segmentId: string, agents: ABTestPersona[]) => void
  updatePersona: (segmentId: string, personaId: string, updates: Partial<ABTestPersona>) => void
  updateConceptName: (id: string, name: string) => void
  updateConceptAttribute: (conceptId: string, attrId: string, field: 'key' | 'value', value: string) => void
  addConceptAttribute: (conceptId: string) => void
  removeConceptAttribute: (conceptId: string, attrId: string) => void
  addResult: (result: EvaluationResult) => void
  addAggregate: (agg: AggregateResult) => void
  addForcedChoice: (choice: ForcedChoiceResult) => void
  reset: () => void
}

export const useABTestStore = create<ABTestState>((set) => ({
  status: 'idle',
  concepts: [
    { id: crypto.randomUUID(), name: '', description: '', attributes: [] },
  ],
  segments: [
    { id: crypto.randomUUID(), name: '', description: '' },
  ],
  dimensions: ['易用性', '价值感', '购买意愿'],
  model: 'gpt-5.4',
  agentCount: 8,
  evalConfig: { scenario: 'friend', customScenario: '', decisionCriteria: '', hypothesis: '', protocol: 'sequential' },
  conceptAttributes: {},
  personaMetrics: {},
  personas: {},
  results: [],
  aggregates: [],
  forcedChoices: [],
  progress: null,

  setConcepts: (concepts) => set({ concepts }),
  setSegments: (segments) => set({ segments }),
  setDimensions: (dimensions) => set({ dimensions }),
  setModel: (model) => set({ model }),
  setAgentCount: (count) => set({ agentCount: count }),
  setEvalConfig: (config) => set({ evalConfig: config }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setConceptAttributes: (attrs) => set({ conceptAttributes: attrs }),
  setPersonaMetrics: (segmentId, metrics) =>
    set((s) => ({ personaMetrics: { ...s.personaMetrics, [segmentId]: metrics } })),
  addPersonas: (segmentId, agents) =>
    set((s) => ({ personas: { ...s.personas, [segmentId]: agents } })),
  updatePersona: (segmentId, personaId, updates) =>
    set((s) => ({
      personas: {
        ...s.personas,
        [segmentId]: (s.personas[segmentId] || []).map(p =>
          p.id === personaId ? { ...p, ...updates } : p
        ),
      },
    })),
  updateConceptName: (id, name) =>
    set((s) => ({ concepts: s.concepts.map(c => c.id === id ? { ...c, name } : c) })),
  updateConceptAttribute: (conceptId, attrId, field, value) =>
    set((s) => ({
      concepts: s.concepts.map(c => c.id === conceptId ? {
        ...c,
        attributes: c.attributes.map(a => a.id === attrId ? { ...a, [field]: value } : a),
      } : c),
    })),
  addConceptAttribute: (conceptId) =>
    set((s) => ({
      concepts: s.concepts.map(c => c.id === conceptId ? {
        ...c,
        attributes: [...c.attributes, { id: crypto.randomUUID(), key: '', value: '' }],
      } : c),
    })),
  removeConceptAttribute: (conceptId, attrId) =>
    set((s) => ({
      concepts: s.concepts.map(c => c.id === conceptId ? {
        ...c,
        attributes: c.attributes.filter(a => a.id !== attrId),
      } : c),
    })),
  addResult: (result) =>
    set((s) => ({ results: [...s.results, result] })),
  addAggregate: (agg) =>
    set((s) => ({ aggregates: [...s.aggregates, agg] })),
  addForcedChoice: (choice) =>
    set((s) => ({ forcedChoices: [...s.forcedChoices, choice] })),
  reset: () => set({
    status: 'idle',
    conceptAttributes: {},
    personaMetrics: {},
    personas: {},
    results: [],
    aggregates: [],
    forcedChoices: [],
    progress: null,
  }),
}))
