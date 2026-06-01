import type { BiasProfile, EmotionState, OceanProfile } from './types'

export const DEFAULT_OCEAN: OceanProfile = {
  openness: 50,
  conscientiousness: 50,
  extraversion: 50,
  agreeableness: 50,
  neuroticism: 50,
}

export const DEFAULT_BIASES: BiasProfile = {
  noveltyResistance: 50,
  authorityDeference: 50,
  lossAversion: 50,
  confirmationBias: 50,
  socialProof: 50,
  anchoring: 50,
}

export function normalizeScore(value: unknown, fallback = 50): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function normalizeOcean(value: unknown): OceanProfile {
  const raw = (value || {}) as Partial<Record<keyof OceanProfile, unknown>>
  return {
    openness: normalizeScore(raw.openness, DEFAULT_OCEAN.openness),
    conscientiousness: normalizeScore(raw.conscientiousness, DEFAULT_OCEAN.conscientiousness),
    extraversion: normalizeScore(raw.extraversion, DEFAULT_OCEAN.extraversion),
    agreeableness: normalizeScore(raw.agreeableness, DEFAULT_OCEAN.agreeableness),
    neuroticism: normalizeScore(raw.neuroticism, DEFAULT_OCEAN.neuroticism),
  }
}

export function normalizeBiases(value: unknown): BiasProfile {
  const raw = (value || {}) as Partial<Record<keyof BiasProfile, unknown>>
  return {
    noveltyResistance: normalizeScore(raw.noveltyResistance, DEFAULT_BIASES.noveltyResistance),
    authorityDeference: normalizeScore(raw.authorityDeference, DEFAULT_BIASES.authorityDeference),
    lossAversion: normalizeScore(raw.lossAversion, DEFAULT_BIASES.lossAversion),
    confirmationBias: normalizeScore(raw.confirmationBias, DEFAULT_BIASES.confirmationBias),
    socialProof: normalizeScore(raw.socialProof, DEFAULT_BIASES.socialProof),
    anchoring: normalizeScore(raw.anchoring, DEFAULT_BIASES.anchoring),
  }
}

export function createRuntimePersonaState(overrides: {
  currentEmotion?: unknown
  emotionIntensity?: unknown
} = {}) {
  return {
    energy: 100,
    turns_since_last_speak: 0,
    accumulated_dissonance: 0,
    previous_dissonance: 0,
    current_belief_vector: [] as number[],
    currentEmotion: (typeof overrides.currentEmotion === 'string' ? overrides.currentEmotion : 'neutral') as EmotionState,
    emotionIntensity: Math.max(0, Math.min(1, Number(overrides.emotionIntensity) || 0)),
  }
}
