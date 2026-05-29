import { chatCompletionJSON, type ModelProvider } from '@/lib/engine/llm'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  const { topic, crowdDescription, agentCount = 4, model = 'gpt-5.4' } = await req.json()

  const crowd = crowdDescription ? `目标人群：${crowdDescription}。` : ''

  const prompt = `生成${agentCount}个讨论"${topic}"的多元角色。${crowd}

每个角色JSON结构：
{
  "name": "英文名",
  "background": "50-80字中文，职业背景与话题关系",
  "personality": "20-30字，性格与沟通风格",
  "stance": "一句话立场",
  "speakingStyle": "15-20字说话方式",
  "knowledgeDomains": ["领域1","领域2"],
  "triggerKeywords": ["词1","词2","词3"],
  "frictionTopics": ["雷区1","雷区2"],
  "tags": ["标签1","标签2","标签3"],
  "engagementCurve": "steady|fading|warming|burst|erratic",
  "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
  "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
}

要求：角色间性格差异大；至少1个攻击性强(低agreeableness高neuroticism)、1个沉默深刻(低extraversion)；ocean/biases值域15-95不要全50；偏见与背景一致。

直接返回JSON，不要markdown包裹：{"agents":[...]}`

  try {
    const result = await chatCompletionJSON<{ agents: Array<{
      name: string
      background: string
      personality: string
      stance: string
      speakingStyle: string
      knowledgeDomains: string[]
      triggerKeywords: string[]
      frictionTopics: string[]
      tags: string[]
      engagementCurve: string
      ocean: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number }
      biases: { noveltyResistance: number; authorityDeference: number; lossAversion: number; confirmationBias: number; socialProof: number; anchoring: number }
    }> }>(
      [{ role: 'user', content: prompt }],
      { temperature: 0.9, maxTokens: 4096, model: model as ModelProvider }
    )

    const defaultOcean = { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 }
    const defaultBiases = { noveltyResistance: 50, authorityDeference: 50, lossAversion: 50, confirmationBias: 50, socialProof: 50, anchoring: 50 }

    const agents = result.agents.map((agent) => ({
      id: crypto.randomUUID(),
      name: agent.name,
      background: agent.background || '',
      personality: agent.personality || '',
      stance: agent.stance || '',
      speakingStyle: agent.speakingStyle || '',
      knowledgeDomains: agent.knowledgeDomains || [],
      triggerKeywords: agent.triggerKeywords || [],
      frictionTopics: agent.frictionTopics || [],
      tags: agent.tags || [],
      engagementCurve: agent.engagementCurve || 'steady',
      ocean: agent.ocean || defaultOcean,
      biases: agent.biases || defaultBiases,
      energy: 100,
      turns_since_last_speak: 0,
      accumulated_dissonance: 0,
      currentEmotion: 'neutral',
      emotionIntensity: 0,
    }))

    return Response.json({ agents })
  } catch (err) {
    console.error('[generate-personas] Error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
