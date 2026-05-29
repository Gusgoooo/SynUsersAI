export interface OceanProfile {
  openness: number        // 0-100: 开放性，高=好奇爱冒险，低=保守务实
  conscientiousness: number // 0-100: 尽责性，高=严谨有条理，低=随性散漫
  extraversion: number    // 0-100: 外向性，高=健谈主动，低=内敛安静
  agreeableness: number   // 0-100: 顺和性，高=包容友善，低=对抗性强
  neuroticism: number     // 0-100: 神经质，高=情绪波动大易焦虑，低=情绪稳定
}

export type EmotionState = 'neutral' | 'curious' | 'irritated' | 'anxious' | 'excited' | 'defensive' | 'dismissive' | 'empathetic'

export interface BiasProfile {
  noveltyResistance: number    // 0-100: 对新事物/新品牌的怀疑度，高=极度挑剔保守
  authorityDeference: number   // 0-100: 对权威/大品牌的信任度，高=盲从权威
  lossAversion: number         // 0-100: 损失厌恶程度，高=极度害怕损失，对涨价/剥夺反应强
  confirmationBias: number     // 0-100: 确认偏误强度，高=只听符合自己观点的
  socialProof: number          // 0-100: 从众倾向，高=别人怎么说就怎么跟
  anchoring: number            // 0-100: 锚定效应，高=第一印象极难改变
}

export interface AgentPersona {
  id: string
  name: string
  background: string
  personality: string
  stance: string
  speakingStyle: string
  knowledgeDomains: string[]
  triggerKeywords: string[]
  frictionTopics: string[]
  tags: string[]
  engagementCurve: 'steady' | 'fading' | 'warming' | 'burst' | 'erratic'
  ocean: OceanProfile
  biases: BiasProfile

  // Runtime state
  energy: number
  turns_since_last_speak: number
  accumulated_dissonance: number
  previous_dissonance: number
  current_belief_vector: number[]
  currentEmotion: EmotionState
  emotionIntensity: number // 0-1
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
