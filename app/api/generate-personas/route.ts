import { chatCompletionJSON, type ModelProvider } from '@/lib/engine/llm'
import { languageInstruction, normalizeLocale } from '@/lib/locale'
import { createRuntimePersonaState, normalizeBiases, normalizeOcean } from '@/lib/persona/defaults'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  const { topic, crowdDescription, agentCount = 4, model = 'gpt-5.4', language = 'zh' } = await req.json()
  const locale = normalizeLocale(language)

  const prompt = locale === 'en'
    ? `Generate ${agentCount} diverse virtual users for a group discussion about "${topic}".

${crowdDescription ? `Target audience: ${crowdDescription}.` : ''}

Language and cultural context:
${languageInstruction(locale)}

Each user must follow this JSON structure:
{
  "name": "English first name or realistic display name",
  "background": "1-2 concise English sentences about work/life background and relationship to the topic",
  "personality": "Short English phrase describing temperament and communication style",
  "stance": "One clear sentence stating this person's initial view",
  "speakingStyle": "Short English description of how they talk",
  "knowledgeDomains": ["domain 1","domain 2"],
  "triggerKeywords": ["keyword 1","keyword 2","keyword 3"],
  "frictionTopics": ["sensitive topic 1","sensitive topic 2"],
  "tags": ["tag 1","tag 2","tag 3"],
  "engagementCurve": "steady|fading|warming|burst|erratic",
  "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
  "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
}

Requirements:
- Make the personas meaningfully different from one another.
- Include at least one combative participant (low agreeableness, high neuroticism).
- Include at least one quiet but thoughtful participant (low extraversion).
- Keep ocean/biases mostly between 15 and 95; do not make everyone average.
- Biases must match the person's background and decision style.
- Use natural English names, tags, domains, triggers, and friction topics.

Return raw JSON only, no markdown: {"agents":[...]}`
    : `生成${agentCount}个讨论"${topic}"的多元角色。${crowdDescription ? `目标人群：${crowdDescription}。` : ''}

语言与文化语境：
${languageInstruction(locale)}

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
      ocean: normalizeOcean(agent.ocean),
      biases: normalizeBiases(agent.biases),
      ...createRuntimePersonaState(),
    }))

    return Response.json({ agents })
  } catch (err) {
    console.error('[generate-personas] Error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
