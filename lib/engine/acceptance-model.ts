/**
 * Deterministic Acceptance Prediction Model
 *
 * Based on:
 * - Davis (1989) Technology Acceptance Model (TAM)
 * - Venkatesh et al. (2003) UTAUT
 * - Costa & McCrae (1992) Big Five → Consumer Behavior
 * - Kahneman & Tversky (1979) Prospect Theory
 *
 * All scores are deterministic: same persona + same concept → same result.
 */

export interface PersonaMetrics {
  priceSensitivity: number    // 0-1, higher = more price sensitive
  noveltyReceptivity: number  // 0-1, higher = more open to new things
  switchInertia: number       // 0-1, higher = harder to switch
  socialProofNeed: number     // 0-1, higher = more influenced by others
  riskTolerance: number       // 0-1, higher = more risk tolerant
}

export interface ConceptAttributes {
  priceLevel: number          // 0-1, relative to market (0=free, 1=premium)
  noveltyLevel: number        // 0-1, how new/different from existing solutions
  switchCost: number          // 0-1, effort required to migrate
  socialValidation: number    // 0-1, brand recognition, user base, reviews
  riskLevel: number           // 0-1, uncertainty, unproven, new brand
}

export interface AcceptanceScores {
  overallAcceptance: number   // 0-100
  priceAcceptance: number     // 0-100
  usabilityFit: number        // 0-100
  emotionalAppeal: number     // 0-100
  switchLikelihood: number    // 0-100
  predictedNPS: number        // -100 to 100
}

interface OceanProfile {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

interface BiasProfile {
  noveltyResistance: number
  authorityDeference: number
  lossAversion: number
  confirmationBias: number
  socialProof: number
  anchoring: number
}

/**
 * Compute deterministic persona metrics from OCEAN + biases.
 * These never change for a given persona.
 */
export function computePersonaMetrics(
  ocean: OceanProfile,
  biases: BiasProfile
): PersonaMetrics {
  const norm = (v: number) => Math.max(0, Math.min(1, v / 100))

  // Price Sensitivity: high conscientiousness + high loss aversion = price sensitive
  // Low openness also correlates with value-seeking behavior
  const priceSensitivity = clamp(
    0.35 * norm(biases.lossAversion) +
    0.25 * norm(ocean.conscientiousness) +
    0.20 * (1 - norm(ocean.openness)) +
    0.20 * (1 - norm(ocean.extraversion))
  )

  // Novelty Receptivity: high openness + low novelty resistance
  // Extraversion also correlates with trying new things (social stimulation)
  const noveltyReceptivity = clamp(
    0.40 * norm(ocean.openness) +
    0.30 * (1 - norm(biases.noveltyResistance)) +
    0.15 * norm(ocean.extraversion) +
    0.15 * (1 - norm(ocean.conscientiousness))
  )

  // Switch Inertia: high confirmation bias + high conscientiousness + high loss aversion
  // People who invest in understanding their current tools resist switching
  const switchInertia = clamp(
    0.30 * norm(biases.confirmationBias) +
    0.25 * norm(ocean.conscientiousness) +
    0.25 * norm(biases.lossAversion) +
    0.20 * (1 - norm(ocean.openness))
  )

  // Social Proof Need: high social proof bias + high extraversion + high agreeableness
  // People who care about what others think/do
  const socialProofNeed = clamp(
    0.35 * norm(biases.socialProof) +
    0.25 * norm(ocean.extraversion) +
    0.25 * norm(ocean.agreeableness) +
    0.15 * norm(biases.authorityDeference)
  )

  // Risk Tolerance: low neuroticism + low loss aversion + high openness
  // People who don't fear the unknown
  const riskTolerance = clamp(
    0.30 * (1 - norm(ocean.neuroticism)) +
    0.30 * (1 - norm(biases.lossAversion)) +
    0.25 * norm(ocean.openness) +
    0.15 * norm(ocean.extraversion)
  )

  return { priceSensitivity, noveltyReceptivity, switchInertia, socialProofNeed, riskTolerance }
}

/**
 * Compute acceptance scores for a (persona, concept) pair.
 * Deterministic: same inputs → same outputs.
 *
 * Model: Each concept attribute interacts with persona metrics.
 * The interaction follows prospect theory: losses loom larger than gains.
 */
export function computeAcceptance(
  metrics: PersonaMetrics,
  concept: ConceptAttributes
): AcceptanceScores {
  // Price Acceptance: inverse of (price sensitivity × price level)
  // Prospect theory: price pain is non-linear (loss aversion)
  const pricePain = metrics.priceSensitivity * concept.priceLevel
  const priceAcceptance = 100 * (1 - Math.pow(pricePain, 1.5))

  // Usability/Effort Fit: switch cost penalized by inertia
  // Low switch cost + low inertia = high acceptance
  const switchBarrier = metrics.switchInertia * concept.switchCost
  const usabilityFit = 100 * (1 - Math.pow(switchBarrier, 1.2))

  // Emotional Appeal: novelty match + social validation
  // Novel concepts appeal to novelty-receptive people
  const noveltyBonus = metrics.noveltyReceptivity * concept.noveltyLevel * 0.6
  const socialBonus = metrics.socialProofNeed * concept.socialValidation * 0.4
  const emotionalAppeal = 100 * clamp(noveltyBonus + socialBonus)

  // Switch Likelihood: risk tolerance vs risk level, modified by overall value
  const riskBarrier = (1 - metrics.riskTolerance) * concept.riskLevel
  const switchLikelihood = 100 * clamp(
    0.4 * (priceAcceptance / 100) +
    0.25 * (usabilityFit / 100) +
    0.20 * (emotionalAppeal / 100) +
    0.15 * (1 - riskBarrier)
  )

  // Overall Acceptance: weighted combination (TAM-inspired)
  // Perceived Usefulness (40%) + Perceived Ease of Use (25%) + Attitude (20%) + Facilitating (15%)
  const overallAcceptance = clamp(
    0.35 * (priceAcceptance / 100) +
    0.25 * (usabilityFit / 100) +
    0.25 * (emotionalAppeal / 100) +
    0.15 * (switchLikelihood / 100)
  ) * 100

  // Predicted NPS: from overall acceptance
  // NPS = % Promoters (>80) - % Detractors (<40)
  // For individual: map to -100..100 scale
  const predictedNPS = Math.round((overallAcceptance - 50) * 2)

  return {
    overallAcceptance: Math.round(overallAcceptance),
    priceAcceptance: Math.round(Math.max(0, priceAcceptance)),
    usabilityFit: Math.round(Math.max(0, usabilityFit)),
    emotionalAppeal: Math.round(Math.max(0, emotionalAppeal)),
    switchLikelihood: Math.round(Math.max(0, switchLikelihood)),
    predictedNPS: Math.max(-100, Math.min(100, predictedNPS)),
  }
}

/**
 * Aggregate acceptance scores across a group of personas for one concept.
 * Returns market-level predictions.
 */
export function aggregateScores(scores: AcceptanceScores[]): {
  mean: AcceptanceScores
  adoptionRate: number    // % who would likely adopt (switchLikelihood > 50)
  npsScore: number        // group NPS
  segmentFit: number      // how well concept fits this segment (0-100)
} {
  if (scores.length === 0) {
    return {
      mean: { overallAcceptance: 0, priceAcceptance: 0, usabilityFit: 0, emotionalAppeal: 0, switchLikelihood: 0, predictedNPS: 0 },
      adoptionRate: 0,
      npsScore: 0,
      segmentFit: 0,
    }
  }

  const sum = (key: keyof AcceptanceScores) =>
    scores.reduce((s, sc) => s + sc[key], 0) / scores.length

  const mean: AcceptanceScores = {
    overallAcceptance: Math.round(sum('overallAcceptance')),
    priceAcceptance: Math.round(sum('priceAcceptance')),
    usabilityFit: Math.round(sum('usabilityFit')),
    emotionalAppeal: Math.round(sum('emotionalAppeal')),
    switchLikelihood: Math.round(sum('switchLikelihood')),
    predictedNPS: Math.round(sum('predictedNPS')),
  }

  const adoptionRate = Math.round(
    (scores.filter(s => s.switchLikelihood > 50).length / scores.length) * 100
  )

  const promoters = scores.filter(s => s.predictedNPS > 30).length
  const detractors = scores.filter(s => s.predictedNPS < -30).length
  const npsScore = Math.round(((promoters - detractors) / scores.length) * 100)

  // Segment fit: low variance in acceptance = good fit (concept resonates uniformly)
  const acceptances = scores.map(s => s.overallAcceptance)
  const meanAcc = acceptances.reduce((a, b) => a + b, 0) / acceptances.length
  const variance = acceptances.reduce((s, v) => s + (v - meanAcc) ** 2, 0) / acceptances.length
  const cv = Math.sqrt(variance) / (meanAcc || 1)
  const segmentFit = Math.round(Math.max(0, 100 * (1 - cv)))

  return { mean, adoptionRate, npsScore, segmentFit }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}
