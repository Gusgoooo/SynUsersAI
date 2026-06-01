import { chatCompletionJSON, type ModelProvider } from '@/lib/engine/llm'
import { languageInstruction, normalizeLocale } from '@/lib/locale'
import { normalizeBiases, normalizeOcean } from '@/lib/persona/defaults'
import { parseRequestProviderConfig } from '@/lib/llm/request-config'

export const runtime = 'nodejs'
export const maxDuration = 120

interface ConceptInput {
  id: string
  description: string
}

interface SegmentInput {
  id: string
  description: string
}

interface GeneratedPersona {
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

export async function POST(req: Request) {
  const { concepts, segments, model = 'gpt-5.4', agentCount = 8, language = 'zh', llmConfig } = await req.json()
  const locale = normalizeLocale(language)
  const providerConfig = parseRequestProviderConfig(llmConfig)

  const conceptDescriptions = (concepts as ConceptInput[])
    .map((c, i) => `${locale === 'en' ? 'Concept' : '方案'}${String.fromCharCode(65 + i)}：\n${c.description}`)
    .join('\n\n---\n\n')

  const segmentDescriptions = (segments as SegmentInput[])
    .map((s, i) => `${locale === 'en' ? 'Segment' : '人群'}${i + 1}：${s.description}`)
    .join('\n')

  // Call A: 方案名称 + 属性拆解
  const conceptPrompt = locale === 'en'
    ? `Analyze the following concepts and audience segments. Generate a concise English name and key attribute breakdown for each concept, plus a short English label for each segment.

Language:
${languageInstruction(locale)}

Concepts:
${conceptDescriptions}

Audience segments:
${segmentDescriptions}

Output JSON:
{
  "concepts": [
    {
      "name": "short concept name in English",
      "attributes": [
        {"id":"random","key":"attribute name such as price/core feature/use case/differentiator","value":"specific value"}
      ]
    }
  ],
  "segments": [
    {"name": "short segment label in English"}
  ]
}

Requirements:
- Concept names should clearly reveal the positioning.
- Extract 3-5 key attributes from each concept.
- Segment labels should be concise and recognizable.
- Return JSON only, no markdown.`
    : `分析以下方案和人群，为每个生成简短名称和属性拆解。

方案内容：
${conceptDescriptions}

人群描述：
${segmentDescriptions}

输出JSON：
{
  "concepts": [
    {
      "name": "3-6字简短方案名称",
      "attributes": [
        {"id":"随机","key":"属性名(如定价/核心功能/目标场景/差异化)","value":"具体值"}
      ]
    }
  ],
  "segments": [
    {"name": "3-6字人群标签"}
  ]
}

要求：
- 方案名称要一眼看懂核心定位
- 属性拆解3-5个关键属性，从方案描述中提取
- 人群标签简短有辨识度`

  // Call B: 为每个 segment 生成 personas
  const conceptContext = (concepts as ConceptInput[]).map((c, i) =>
    `「${locale === 'en' ? 'Concept' : '方案'}${String.fromCharCode(65 + i)}」：${c.description.replace(/<[^>]+>/g, '').slice(0, 100)}`
  ).join('\n')

  const personaPromises = (segments as SegmentInput[]).map(async (segment) => {
    const prompt = locale === 'en'
      ? `You are a user researcher. Generate ${agentCount} realistic consumer personas.

Language:
${languageInstruction(locale)}

Audience segment: ${segment.description}
Concepts to evaluate:
${conceptContext}

Each user must follow this JSON structure:
{
  "name": "realistic English first name",
  "background": "1-2 concise English sentences with age, role, lifestyle, and spending context",
  "personality": "short phrase describing personality and decision tendency",
  "currentSolution": "specific current alternative, product, or workaround",
  "monthlyBudget": "monthly budget for this category, e.g. '$10-30'",
  "decisionStyle": "impulsive/research-driven/social-proof-driven/price-sensitive/quality-first/etc.",
  "painPoints": ["specific current pain point 1","pain point 2"],
  "tags": ["tag 1","tag 2","tag 3"],
  "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
  "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
}

Requirements:
- Keep ocean/biases mostly between 15 and 95; avoid bland average profiles.
- Include one very frugal persona, one high willingness-to-pay persona, and one burned-before skeptical persona.
- currentSolution must be a specific product or method.
- painPoints must come from realistic usage contexts.
- Each person's traits and biases must match their background and decision style.

Return JSON only: {"agents":[...]}`
      : `你是用户研究专家。生成${agentCount}个真实消费者画像。

人群特征：${segment.description}
将评估的方案：${conceptContext}

每个用户JSON结构：
{
  "name": "中文名(2-3字)",
  "background": "50-70字，具体职业、年龄、生活状态、消费水平",
  "personality": "20字，性格与决策倾向",
  "currentSolution": "TA目前用什么替代方案（具体产品名/方法）",
  "monthlyBudget": "该品类月消费预算（如'50-100元'）",
  "decisionStyle": "冲动型/研究型/跟风型/价格驱动型/品质优先型",
  "painPoints": ["当前方案的具体痛点1","痛点2"],
  "tags": ["标签1","标签2","标签3"],
  "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
  "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
}

关键要求：
- ocean/biases 值域15-95，不要全50，要有极端个体
- 必须包含：1个"极度抠门只要免费"(高lossAversion高conscientiousness)、1个"愿意付高价"(低lossAversion高openness)、1个"被坑过所以警惕"(高neuroticism高noveltyResistance)
- currentSolution 必须具体产品名
- painPoints 来自真实使用场景
- 每个人的 ocean/biases 要与 personality/decisionStyle 一致

直接返回JSON：{"agents":[...]}`

    try {
      const result = await chatCompletionJSON<{ agents: GeneratedPersona[] }>(
        [{ role: 'user', content: prompt }],
        { temperature: 0.9, maxTokens: 6000, model: model as ModelProvider, providerConfig }
      )
      return {
        segmentId: segment.id,
        personas: (result.agents || []).map(a => ({
          ...a,
          id: crypto.randomUUID(),
          ocean: normalizeOcean(a.ocean),
          biases: normalizeBiases(a.biases),
        })),
      }
    } catch (e) {
      console.error(`[Prepare] Persona generation failed for segment ${segment.id}:`, e)
      return { segmentId: segment.id, personas: [] }
    }
  })

  try {
    // Run concept analysis and persona generation in parallel
    const [conceptResult, ...personaResults] = await Promise.all([
      chatCompletionJSON<{
        concepts: Array<{ name: string; attributes: Array<{ id: string; key: string; value: string }> }>
        segments: Array<{ name: string }>
      }>(
        [{ role: 'user', content: conceptPrompt }],
        { temperature: 0.3, maxTokens: 2048, model: model as ModelProvider, providerConfig }
      ),
      ...personaPromises,
    ])

    const processedConcepts = (conceptResult.concepts || []).map(c => ({
      ...c,
      attributes: (c.attributes || []).map(a => ({
        ...a,
        id: crypto.randomUUID(),
      })),
    }))

    const personas: Record<string, GeneratedPersona[]> = {}
    for (const r of personaResults) {
      personas[r.segmentId] = r.personas
    }

    return Response.json({
      concepts: processedConcepts,
      segments: conceptResult.segments || [],
      personas,
    })
  } catch (err) {
    console.error('[ABTest Prepare] Error:', err)
    return Response.json({
      concepts: (concepts as ConceptInput[]).map((_, i) => ({
        name: locale === 'en' ? `Concept ${String.fromCharCode(65 + i)}` : `方案${String.fromCharCode(65 + i)}`,
        attributes: [],
      })),
      segments: (segments as SegmentInput[]).map((_, i) => ({
        name: locale === 'en' ? `Segment ${i + 1}` : `人群${i + 1}`,
      })),
      personas: {},
    })
  }
}
