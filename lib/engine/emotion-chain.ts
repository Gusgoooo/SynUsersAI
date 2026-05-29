import type { AgentPersona, EmotionState, OceanProfile } from './types'

interface EmotionTransition {
  emotion: EmotionState
  intensity: number
}

export function computeEmotionChain(
  agent: AgentPersona,
  dissonance: number,
  isDirectlyAddressed: boolean
): EmotionTransition {
  const { ocean } = agent
  const prev = agent.currentEmotion
  const prevIntensity = agent.emotionIntensity

  let newEmotion: EmotionState = prev
  let intensity = prevIntensity

  // High neuroticism → emotional spikes from dissonance
  const emotionalReactivity = ocean.neuroticism / 100
  // Low agreeableness → confrontational under pressure
  const confrontationTendency = 1 - ocean.agreeableness / 100
  // High openness → curiosity over defensiveness
  const curiosityBias = ocean.openness / 100
  // High extraversion → stronger expression, faster recovery
  const expressionAmplifier = 0.5 + (ocean.extraversion / 200)

  if (dissonance > 0.6) {
    // Strong conflict with beliefs
    if (emotionalReactivity > 0.6) {
      // High neuroticism: anxiety or irritation
      newEmotion = confrontationTendency > 0.5 ? 'irritated' : 'anxious'
      intensity = Math.min(1, dissonance * emotionalReactivity * expressionAmplifier)
    } else if (curiosityBias > 0.6) {
      // High openness, low neuroticism: curious engagement
      newEmotion = 'curious'
      intensity = dissonance * 0.6
    } else {
      // Low everything: defensive withdrawal
      newEmotion = 'defensive'
      intensity = dissonance * 0.5
    }
  } else if (dissonance > 0.3) {
    // Moderate tension
    if (confrontationTendency > 0.6 && emotionalReactivity > 0.4) {
      newEmotion = 'irritated'
      intensity = dissonance * confrontationTendency
    } else if (curiosityBias > 0.5) {
      newEmotion = 'curious'
      intensity = dissonance * curiosityBias * 0.7
    } else {
      newEmotion = prev === 'neutral' ? 'neutral' : prev
      intensity = Math.max(0, prevIntensity - 0.1)
    }
  } else {
    // Low dissonance — gradual return to baseline
    const decayRate = ocean.extraversion > 60 ? 0.3 : 0.15
    intensity = Math.max(0, prevIntensity - decayRate)
    if (intensity < 0.1) newEmotion = 'neutral'
  }

  // Being directly addressed amplifies
  if (isDirectlyAddressed) {
    intensity = Math.min(1, intensity * 1.4)
    if (ocean.extraversion < 35 && dissonance > 0.3) {
      newEmotion = 'defensive'
    }
  }

  // Emotion contagion: accumulated dissonance builds anxiety in high-N agents
  if (agent.accumulated_dissonance > 2.0 && emotionalReactivity > 0.5) {
    if (newEmotion === 'neutral' || newEmotion === 'curious') {
      newEmotion = 'anxious'
      intensity = Math.max(intensity, 0.4)
    }
  }

  return { emotion: newEmotion, intensity: Math.round(intensity * 100) / 100 }
}

export function getEmotionModifier(agent: AgentPersona): string {
  const { currentEmotion, emotionIntensity, ocean } = agent
  if (emotionIntensity < 0.2) return ''

  const intensityWord = emotionIntensity > 0.7 ? '非常' : emotionIntensity > 0.4 ? '比较' : '有点'

  switch (currentEmotion) {
    case 'irritated':
      return ocean.agreeableness < 40
        ? `你现在${intensityWord}烦躁，语气会更冲更直接，甚至有攻击性。`
        : `你现在${intensityWord}不耐烦，但还控制着语气。`
    case 'anxious':
      return `你现在${intensityWord}焦虑，会不自觉地表现出不安，可能说话更快、更碎片化。`
    case 'curious':
      return `你现在${intensityWord}好奇，想追问细节，会主动提问。`
    case 'excited':
      return `你现在${intensityWord}兴奋，说话会更有激情，可能语速加快。`
    case 'defensive':
      return `你现在${intensityWord}防御，会本能地保护自己的观点，对挑战过度反应。`
    case 'dismissive':
      return `你现在${intensityWord}不屑，觉得别人说的没价值，可能会冷嘲。`
    case 'empathetic':
      return `你现在${intensityWord}共情，更愿意倾听和理解对方的感受。`
    default:
      return ''
  }
}
