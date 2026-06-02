import type { Locale } from '@/lib/locale'

export type RoundtableDurationTier = 'short' | 'medium' | 'long'

export interface RoundtableDurationPreset {
  key: RoundtableDurationTier
  legacyMinutes: number
  rangeLabel: Record<Locale, string>
  label: Record<Locale, string>
  description: Record<Locale, string>
  lowerBoundTurns: number
  narrowAfterTurns: number
  summarizeAfterTurns: number
  safetyMaxTurns: number
  stagnationWindow: number
  lowNoveltyThreshold: number
  maxRuntimeMinutes: number
}

export const ROUNDTABLE_DURATION_PRESETS: Record<RoundtableDurationTier, RoundtableDurationPreset> = {
  short: {
    key: 'short',
    legacyMinutes: 30,
    rangeLabel: { zh: '约 30 分钟', en: 'About 30 min' },
    label: { zh: '短', en: 'Short' },
    description: {
      zh: '精简圆桌：覆盖主要立场，完成基础碰撞后收束。',
      en: 'Compact roundtable: cover main positions, allow a real clash, then converge.',
    },
    lowerBoundTurns: 36,
    narrowAfterTurns: 28,
    summarizeAfterTurns: 44,
    safetyMaxTurns: 70,
    stagnationWindow: 6,
    lowNoveltyThreshold: 0.12,
    maxRuntimeMinutes: 35,
  },
  medium: {
    key: 'medium',
    legacyMinutes: 60,
    rangeLabel: { zh: '约 60 分钟', en: 'About 60 min' },
    label: { zh: '中', en: 'Medium' },
    description: {
      zh: '充分碰撞：允许观点展开、交锋，再自然收束。',
      en: 'Fuller clash: let arguments develop, collide, then settle.',
    },
    lowerBoundTurns: 72,
    narrowAfterTurns: 56,
    summarizeAfterTurns: 88,
    safetyMaxTurns: 130,
    stagnationWindow: 8,
    lowNoveltyThreshold: 0.1,
    maxRuntimeMinutes: 70,
  },
  long: {
    key: 'long',
    legacyMinutes: 90,
    rangeLabel: { zh: '约 90 分钟', en: 'About 90 min' },
    label: { zh: '长', en: 'Long' },
    description: {
      zh: '深挖复盘：保留更多反例、条件和立场变化，再总结。',
      en: 'Deep dive: preserve more counterexamples, conditions, and stance shifts before synthesis.',
    },
    lowerBoundTurns: 108,
    narrowAfterTurns: 84,
    summarizeAfterTurns: 132,
    safetyMaxTurns: 190,
    stagnationWindow: 10,
    lowNoveltyThreshold: 0.09,
    maxRuntimeMinutes: 105,
  },
}

export function getRoundtableDurationPreset(tier: RoundtableDurationTier | undefined): RoundtableDurationPreset {
  return ROUNDTABLE_DURATION_PRESETS[tier || 'medium'] || ROUNDTABLE_DURATION_PRESETS.medium
}

export function normalizeRoundtableDurationTier(
  value: unknown,
  legacyMinutes?: unknown
): RoundtableDurationTier {
  if (value === 'short' || value === 'medium' || value === 'long') return value

  const minutes = Number(legacyMinutes)
  if (Number.isFinite(minutes)) {
    if (minutes <= 30) return 'short'
    if (minutes <= 75) return 'medium'
    return 'long'
  }

  return 'medium'
}

export function formatRoundtableDuration(
  tier: RoundtableDurationTier | undefined,
  locale: Locale
): string {
  const preset = getRoundtableDurationPreset(tier)
  return `${preset.label[locale]} · ${preset.rangeLabel[locale]}`
}
