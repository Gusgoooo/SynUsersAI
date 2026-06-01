import { chatCompletionJSON, chatCompletionStream, type ModelProvider, type StreamChunk } from '@/lib/engine/llm'
import { computePersonaMetrics, computeAcceptance, aggregateScores, type ConceptAttributes, type PersonaMetrics, type AcceptanceScores } from '@/lib/engine/acceptance-model'
import { languageInstruction, normalizeLocale, type Locale } from '@/lib/locale'
import { normalizeBiases, normalizeOcean } from '@/lib/persona/defaults'
import { parseRequestProviderConfig } from '@/lib/llm/request-config'

export const runtime = 'nodejs'
export const maxDuration = 300

interface ConceptAttribute {
  id: string
  key: string
  value: string
}

interface Concept {
  id: string
  name: string
  description: string
  attributes?: ConceptAttribute[]
}

interface Segment {
  id: string
  name: string
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

function formatConceptContent(concept: Concept, locale: Locale = 'zh'): string {
  let content = concept.description || ''
  if (concept.attributes && concept.attributes.length > 0) {
    const attrLines = concept.attributes
      .filter(a => a.key && a.value)
      .map(a => `- ${a.key}: ${a.value}`)
      .join('\n')
    if (attrLines) {
      content += (content ? '\n\n' : '') + (locale === 'en' ? 'Attribute breakdown:\n' : '属性拆解：\n') + attrLines
    }
  }
  return content
}

function getConceptLabel(concept: Concept, index: number, locale: Locale = 'zh'): string {
  return concept.name || (locale === 'en' ? `Concept ${String.fromCharCode(65 + index)}` : `方案${String.fromCharCode(65 + index)}`)
}

interface EvalConfig {
  scenario: string
  customScenario: string
  decisionCriteria: string
  hypothesis: string
  protocol: 'sequential' | 'monadic'
}

const SCENARIO_PROMPTS: Record<string, string> = {
  friend: '你的一个信任的朋友/同事兴奋地跟你说："我最近发现了个好东西，你一定要试试！"然后给你介绍了这个方案',
  ad: '你在刷手机时看到一条信息流广告，内容是这个方案',
  search: '你正在主动寻找解决当前痛点的方案，在对比调研中发现了这个',
  mandate: '公司/团队通知你要统一使用这个方案，你需要评估接受程度',
  custom: '',
}

const SCENARIO_PROMPTS_EN: Record<string, string> = {
  friend: 'A trusted friend or coworker enthusiastically says, "I found something you should try," then explains this concept to you.',
  ad: 'You see this concept as an in-feed ad while scrolling on your phone.',
  search: 'You are actively looking for a solution to your current pain point and discover this while comparing options.',
  mandate: 'Your company or team announces that everyone may need to use this solution, so you are evaluating whether you can accept it.',
  custom: '',
}

export async function POST(req: Request) {
  const { concepts, segments, dimensions, model = 'gpt-5.4', agentCount = 8, evalConfig, language = 'zh', llmConfig } = await req.json()
  const locale = normalizeLocale(language)
  const providerConfig = parseRequestProviderConfig(llmConfig)
  const config: EvalConfig = evalConfig || { scenario: 'friend', customScenario: '', decisionCriteria: '', hypothesis: '', protocol: 'sequential' }
  const scenarioSet = locale === 'en' ? SCENARIO_PROMPTS_EN : SCENARIO_PROMPTS
  const scenarioPrompt = config.scenario === 'custom' ? config.customScenario : (scenarioSet[config.scenario] || scenarioSet.friend)

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  async function send(event: string, data: unknown) {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  function progressText(phase: 'attributes' | 'personas' | 'eval' | 'choice', detail?: string) {
    const labels = locale === 'en'
      ? {
          attributes: 'LLM is analyzing concept attributes',
          personas: 'LLM is generating segment personas',
          eval: 'AI users are evaluating one concept',
          choice: 'AI users are making forced choices',
        }
      : {
          attributes: '大模型正在分析方案属性',
          personas: '大模型正在生成细分人群画像',
          eval: 'AI 用户正在代入画像评价方案',
          choice: 'AI 用户正在做强制选择',
        }
    const details = locale === 'en'
      ? {
          attributes: 'Extracting price level, novelty, switching cost, social proof, and risk for each concept.',
          personas: 'Creating budget, current solution, pain points, decision style, OCEAN, and bias profiles.',
          eval: 'Combining deterministic acceptance scores with role-played qualitative reactions.',
          choice: 'Comparing prior reactions and choosing one option under budget and attention constraints.',
        }
      : {
          attributes: '拆解每个方案的价格水平、新颖度、迁移成本、社会验证和风险。',
          personas: '生成预算、现有方案、痛点、决策风格、OCEAN 和偏差画像。',
          eval: '把确定性的接受度模型与代入式定性反应结合起来。',
          choice: '结合第一轮反应，在预算和注意力约束下只选一个方案。',
        }
    return { label: labels[phase], detail: detail || details[phase] }
  }

  ;(async () => {
    try {
      // ═══════════════════════════════════════════
      // Phase 0: LLM 推断方案属性（一次性，固定）
      // ═══════════════════════════════════════════
      await send('progress', { phase: 'attributes', current: 0, total: 1, ...progressText('attributes') })

      const conceptAttrsPrompt = locale === 'en'
        ? `You are a product analyst. Evaluate each concept on five normalized attributes from 0 to 1.

Language:
${languageInstruction(locale)}

${(concepts as Concept[]).map((c, i) => `Concept ${String.fromCharCode(65 + i)} "${getConceptLabel(c, i, locale)}":\n${formatConceptContent(c, locale)}`).join('\n\n')}

Attribute definitions:
- priceLevel: pricing level (0=free, 0.3=low price, 0.5=mid, 0.7=expensive, 1=extremely expensive)
- noveltyLevel: market novelty (0=mature category, 0.5=some innovation, 1=unprecedented)
- switchCost: migration cost (0=instant use, 0.5=requires learning, 1=major data/process migration)
- socialValidation: social proof (0=unknown, 0.5=some traction, 1=well-known brand/category)
- riskLevel: uncertainty/risk (0=proven, 0.5=some uncertainty, 1=unvalidated)

Output JSON: {"concepts": [{"id":"concept ID", "priceLevel":number, "noveltyLevel":number, "switchCost":number, "socialValidation":number, "riskLevel":number}, ...]}`
        : `你是产品分析师。请为以下方案评估5个属性值（0-1之间的小数）：

${(concepts as Concept[]).map((c, i) => `方案${String.fromCharCode(65 + i)}「${getConceptLabel(c, i, locale)}」：\n${formatConceptContent(c, locale)}`).join('\n\n')}

属性定义：
- priceLevel: 定价水平（0=完全免费, 0.3=低价, 0.5=中等, 0.7=较贵, 1=极其昂贵）
- noveltyLevel: 市场新颖程度（0=完全成熟的品类, 0.5=有创新, 1=前所未有的新概念）
- switchCost: 用户迁移成本（0=即开即用, 0.5=需要学习, 1=需要大量数据迁移/重新学习）
- socialValidation: 社会验证（0=无人知晓, 0.5=小有名气, 1=人尽皆知的大品牌）
- riskLevel: 不确定性/风险（0=久经验证, 0.5=有一些不确定, 1=完全未经验证）

输出JSON：{"concepts": [{"id":"方案ID", "priceLevel":数值, "noveltyLevel":数值, "switchCost":数值, "socialValidation":数值, "riskLevel":数值}, ...]}`

      let conceptAttributes: Record<string, ConceptAttributes> = {}
      try {
        const attrResult = await chatCompletionJSON<{
          concepts: Array<{ id: string } & ConceptAttributes>
        }>(
          [{ role: 'user', content: conceptAttrsPrompt }],
          { temperature: 0.3, maxTokens: 1024, model: model as ModelProvider, providerConfig }
        )

        for (let i = 0; i < (concepts as Concept[]).length; i++) {
          const c = (concepts as Concept[])[i]
          const attr = attrResult.concepts?.[i] || { priceLevel: 0.5, noveltyLevel: 0.5, switchCost: 0.3, socialValidation: 0.3, riskLevel: 0.5 }
          conceptAttributes[c.id] = {
            priceLevel: clamp01(attr.priceLevel),
            noveltyLevel: clamp01(attr.noveltyLevel),
            switchCost: clamp01(attr.switchCost),
            socialValidation: clamp01(attr.socialValidation),
            riskLevel: clamp01(attr.riskLevel),
          }
        }
      } catch (e) {
        console.error('[ABTest] Concept attribute inference failed:', e)
        for (const c of concepts as Concept[]) {
          conceptAttributes[c.id] = { priceLevel: 0.5, noveltyLevel: 0.5, switchCost: 0.3, socialValidation: 0.3, riskLevel: 0.5 }
        }
      }

      await send('concept-attributes', conceptAttributes)

      // ═══════════════════════════════════════════
      // Phase 1: 生成深度消费者画像（含 OCEAN + biases）
      // ═══════════════════════════════════════════
      const allPersonas: Record<string, GeneratedPersona[]> = {}

      for (let si = 0; si < segments.length; si++) {
        const segment: Segment = segments[si]
        await send('progress', {
          phase: 'personas',
          segmentName: segment.name,
          current: si,
          total: segments.length,
          ...progressText(
            'personas',
            locale === 'en'
              ? `Generating ${agentCount} consumer personas for "${segment.name}".`
              : `正在为「${segment.name}」生成 ${agentCount} 个消费者画像。`
          ),
        })

        const conceptContext = (concepts as Concept[]).map((c, i) => `「${getConceptLabel(c, i, locale)}」：${formatConceptContent(c, locale).slice(0, 100)}`).join('\n')

        const prompt = locale === 'en'
          ? `You are a user research expert. Generate ${agentCount} realistic consumer personas.

Language:
${languageInstruction(locale)}

Audience segment: ${segment.description}
Concepts to evaluate:
${conceptContext}

Each user must follow this JSON structure:
{
  "name": "realistic English first name",
  "background": "1-2 concise English sentences with role, age, life context, and spending power",
  "personality": "short phrase describing temperament and decision tendency",
  "currentSolution": "specific current alternative or product",
  "monthlyBudget": "monthly budget for this category",
  "decisionStyle": "impulsive/research-driven/social-proof-driven/price-sensitive/quality-first/etc.",
  "painPoints": ["specific pain point 1","pain point 2"],
  "tags": ["tag 1","tag 2","tag 3"],
  "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
  "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
}

Requirements:
- Keep ocean/biases mostly between 15 and 95; include some extreme profiles.
- Include one very frugal free-only persona, one high willingness-to-pay persona, and one skeptical burned-before persona.
- currentSolution must be specific.
- painPoints must come from realistic usage contexts.
- Traits and biases must match background and decision style.

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

        const result = await chatCompletionJSON<{ agents: GeneratedPersona[] }>(
          [{ role: 'user', content: prompt }],
          { temperature: 0.9, maxTokens: 6000, model: model as ModelProvider, providerConfig }
        )

        const personas = (result.agents || []).map((a) => ({
          ...a,
          id: crypto.randomUUID(),
          ocean: normalizeOcean(a.ocean),
          biases: normalizeBiases(a.biases),
        }))

        allPersonas[segment.id] = personas
        await send('personas', { segmentId: segment.id, agents: personas })

        // Emit deterministic metrics for each persona
        const metricsMap: Record<string, PersonaMetrics> = {}
        for (const p of personas) {
          metricsMap[p.id] = computePersonaMetrics(p.ocean, p.biases)
        }
        await send('persona-metrics', { segmentId: segment.id, metrics: metricsMap })
      }

      // ═══════════════════════════════════════════
      // Phase 2: 确定性预测 + 情境评估
      // ═══════════════════════════════════════════
      const totalEvals = segments.reduce((sum: number, seg: Segment) =>
        sum + (allPersonas[seg.id]?.length || 0) * concepts.length, 0)
      let evalCount = 0

      const round1Results: Record<string, Record<string, { impression: string; attitude: string }>> = {}

      for (const segment of segments as Segment[]) {
        const personas = allPersonas[segment.id] || []

        for (const concept of concepts as Concept[]) {
          const attrs = conceptAttributes[concept.id]
          const shuffled = [...personas].sort(() => Math.random() - 0.5)

          for (const persona of shuffled) {
            evalCount++
            await send('progress', {
              phase: 'eval',
              segmentName: segment.name,
              conceptName: concept.name,
              current: evalCount,
              total: totalEvals,
              ...progressText(
                'eval',
                locale === 'en'
                  ? `${persona.name} is evaluating "${getConceptLabel(concept, (concepts as Concept[]).indexOf(concept), locale)}" from their budget, pain points, and decision style.`
                  : `${persona.name} 正在根据自己的预算、痛点和决策风格评价「${getConceptLabel(concept, (concepts as Concept[]).indexOf(concept), locale)}」。`
              ),
            })

            // Deterministic quantitative scores
            const metrics = computePersonaMetrics(persona.ocean, persona.biases)
            const acceptance = computeAcceptance(metrics, attrs)

            // Qualitative LLM evaluation (情境沉浸 + 维度评分)
            const dimList = (dimensions as string[]).map((d: string) => locale === 'en'
              ? `"${d}": {"score": 1-10, "reason": "specific reason tied to your budget/pain/current solution/decision style, 20-45 English words"}`
              : `"${d}": {"score": 1-10分, "reason": "结合你个人情况的具体理由(30-60字)"}`).join(',\n  ')
            const evalPrompt = locale === 'en'
              ? `You are ${persona.name}. Fully roleplay the following realistic consumer profile.

Language:
${languageInstruction(locale)}

Who you are:
- Background: ${persona.background}
- Personality: ${persona.personality}
- Decision style: ${persona.decisionStyle}
- Monthly budget: ${persona.monthlyBudget}
- Current solution: ${persona.currentSolution}
- Current pain points: ${persona.painPoints.join('; ')}

Scenario:
${scenarioPrompt}

Concept: "${getConceptLabel(concept, (concepts as Concept[]).indexOf(concept), locale)}"
${formatConceptContent(concept, locale)}

Evaluate this concept based on your own situation:

1. First reaction: intuitive, conversational, 20-45 English words. It can be excited, skeptical, annoyed, or indifferent.
2. Score each dimension from 1-10 and give a concrete reason tied to your personal context.
3. Overall attitude: strong_yes / yes / neutral / no / strong_no
4. Attitude reason: one concise English sentence explaining the core reason.

Rules:
- Scores must reflect your profile. If you are budget constrained and the concept is expensive, value/price scores should be lower.
- Speak plainly. If it feels useless, say so.
- Do not hedge with "it depends" or "each option has pros and cons".
- Scores must show contrast; do not give everything 5-7.

Output JSON:
{
  "firstImpression": "first reaction",
  "dimensionScores": {
  ${dimList}
  },
  "attitude": "strong_yes/yes/neutral/no/strong_no",
  "attitudeReason": "core attitude reason"
}`
              : `你是${persona.name}。以下是你的真实情况，请完全代入：

【你是谁】
- 背景：${persona.background}
- 性格：${persona.personality}
- 决策风格：${persona.decisionStyle}
- 月预算：${persona.monthlyBudget}
- 目前在用：${persona.currentSolution}
- 当前痛点：${persona.painPoints.join('；')}

【场景】
${scenarioPrompt}

【方案内容】「${getConceptLabel(concept, (concepts as Concept[]).indexOf(concept), locale)}」
${formatConceptContent(concept, locale)}

请基于你的个人情况，对这个方案做出真实评价：

1. 第一反应（直觉，30-50字，口语化，可以吐槽/兴奋/怀疑/无感）
2. 对以下每个维度打分(1-10)并给出结合你个人情况的具体理由（不是泛泛而谈，要联系你的预算/痛点/现有方案/决策习惯）
3. 总体态度：strong_yes(立刻想用) / yes(值得一试) / neutral(观望) / no(不适合我) / strong_no(完全不考虑)
4. 态度理由：结合你的核心诉求，一句话说清楚为什么

【重要规则】
- 你的评分必须体现你的个人特征（如果你预算有限且方案很贵，价值感/性价比分数就该低）
- 说人话，不要客套。觉得没用就说没用
- 不许和稀泥。不许出现"各有优势""还不错但也有不足"这种废话
- 分数要有区分度，不要全给5-7分

输出JSON：
{
  "firstImpression": "第一反应",
  "dimensionScores": {
  ${dimList}
  },
  "attitude": "strong_yes/yes/neutral/no/strong_no",
  "attitudeReason": "态度核心理由(20-40字)"
}`

            let qualitative = { firstImpression: '', dimensionScores: {} as Record<string, { score: number; reason: string }>, attitude: 'neutral' as string, attitudeReason: '' }
            try {
              qualitative = await chatCompletionJSON<typeof qualitative>(
                [{ role: 'user', content: evalPrompt }],
                { temperature: 0.8, maxTokens: 1200, model: model as ModelProvider, providerConfig }
              )
            } catch (e) {
              console.error(`[ABTest R1] ${persona.name} × ${concept.name}:`, e)
              qualitative = locale === 'en'
                ? { firstImpression: 'Evaluation failed', dimensionScores: {}, attitude: 'neutral', attitudeReason: 'Unable to evaluate' }
                : { firstImpression: '评估异常', dimensionScores: {}, attitude: 'neutral', attitudeReason: '无法评估' }
            }

            if (!round1Results[persona.id]) round1Results[persona.id] = {}
            round1Results[persona.id][concept.id] = {
              impression: qualitative.firstImpression,
              attitude: qualitative.attitude,
            }

            await send('evaluation', {
              personaId: persona.id,
              personaName: persona.name,
              conceptId: concept.id,
              segmentId: segment.id,
              acceptance,
              dimensionScores: qualitative.dimensionScores,
              firstImpression: qualitative.firstImpression,
              attitude: qualitative.attitude,
              attitudeReason: qualitative.attitudeReason,
            })
          }

          // Emit aggregate for this segment × concept
          const segPersonas = allPersonas[segment.id] || []
          const segScores: AcceptanceScores[] = segPersonas.map(p => {
            const m = computePersonaMetrics(p.ocean, p.biases)
            return computeAcceptance(m, attrs)
          })
          const agg = aggregateScores(segScores)
          await send('aggregate', {
            segmentId: segment.id,
            conceptId: concept.id,
            ...agg,
          })
        }
      }

      // ═══════════════════════════════════════════
      // Phase 3 (Round 2): 强制选择
      // ═══════════════════════════════════════════
      if (concepts.length >= 2) {
        let choiceCount = 0
        const totalChoices = segments.reduce((sum: number, seg: Segment) =>
          sum + (allPersonas[seg.id]?.length || 0), 0)

        for (const segment of segments as Segment[]) {
          const personas = allPersonas[segment.id] || []

          for (const persona of personas) {
            choiceCount++
            await send('progress', {
              phase: 'choice',
              segmentName: segment.name,
              current: choiceCount,
              total: totalChoices,
              ...progressText(
                'choice',
                locale === 'en'
                  ? `${persona.name} must choose one concept and reject the others with concrete reasons.`
                  : `${persona.name} 必须选择一个方案，并给出放弃其他方案的具体理由。`
              ),
            })

            const conceptSummaries = (concepts as Concept[]).map((c, idx) => {
              const r1 = round1Results[persona.id]?.[c.id]
              const impression = r1?.impression || (locale === 'en' ? 'not evaluated' : '未评价')
              const attitude = r1?.attitude || (locale === 'en' ? 'no attitude yet' : '未表态')
              return locale === 'en'
                ? `- "${getConceptLabel(c, idx, locale)}" (ID:${c.id}): ${formatConceptContent(c, locale).slice(0, 80)} (your attitude: ${attitude}; you said: ${impression})`
                : `- 「${getConceptLabel(c, idx, locale)}」(ID:${c.id})：${formatConceptContent(c, locale).slice(0, 60)}（你的态度：${attitude}，你说：${impression}）`
            }).join('\n')

            const choicePrompt = locale === 'en'
              ? `You are ${persona.name}. ${persona.background}
Decision style: ${persona.decisionStyle}. Monthly budget: ${persona.monthlyBudget}.

Language:
${languageInstruction(locale)}

You have reviewed these concepts:
${conceptSummaries}

You must choose one. Rules:
- Your budget/attention only allows one.
- Do not say "it depends", "either is fine", or "they all have strengths".
- Your choice must be consistent with your earlier reactions.
- Give a fatal reason for each rejected concept.

Output JSON:
{
  "chosenConceptId": "chosen concept ID, must be one of the IDs above",
  "reasoning": "why you chose it, under 20 English words",
  "rejectionReasons": {"rejected concept ID": "one concise fatal reason"}
}`
              : `你是${persona.name}。${persona.background}。
决策风格：${persona.decisionStyle}。月预算：${persona.monthlyBudget}。

你看了这几个方案：
${conceptSummaries}

现在必须选一个。规则：
- 钱包只够一个
- 不许说"都行""看情况""各有优势"
- 选择必须跟你之前的反应一致
- 对每个放弃的方案说出致命理由

输出JSON：
{
  "chosenConceptId": "选的方案ID（必须是上面的ID之一）",
  "reasoning": "为什么选这个（不超30字）",
  "rejectionReasons": {"被放弃方案ID": "致命理由一句话"}
}`

            try {
              const choiceResult = await chatCompletionJSON<{
                chosenConceptId: string
                reasoning: string
                rejectionReasons: Record<string, string>
              }>(
                [{ role: 'user', content: choicePrompt }],
                { temperature: 0.6, maxTokens: 512, model: model as ModelProvider, providerConfig }
              )

              const validIds = (concepts as Concept[]).map(c => c.id)
              let chosenId = choiceResult.chosenConceptId
              if (!validIds.includes(chosenId)) {
                const matched = (concepts as Concept[]).find(c =>
                  c.name === chosenId || chosenId.includes(c.name)
                )
                chosenId = matched?.id || validIds[0]
              }

              await send('forced-choice', {
                personaId: persona.id,
                personaName: persona.name,
                segmentId: segment.id,
                chosenConceptId: chosenId,
                reasoning: choiceResult.reasoning || '',
                rejectionReasons: choiceResult.rejectionReasons || {},
              })
            } catch (e) {
              console.error(`[ABTest R2] ${persona.name} forced choice:`, e)
              // Fallback: choose concept with highest acceptance score
              const metrics = computePersonaMetrics(persona.ocean, persona.biases)
              let bestId = (concepts as Concept[])[0].id
              let bestScore = 0
              for (const c of concepts as Concept[]) {
                const score = computeAcceptance(metrics, conceptAttributes[c.id]).overallAcceptance
                if (score > bestScore) { bestScore = score; bestId = c.id }
              }
              await send('forced-choice', {
                personaId: persona.id,
                personaName: persona.name,
                segmentId: segment.id,
                chosenConceptId: bestId,
                reasoning: locale === 'en' ? 'Inferred from quantitative model' : '基于量化模型推断',
                rejectionReasons: {},
              })
            }
          }
        }
      }

      await send('done', {})
    } catch (err) {
      await send('error', { message: String(err) })
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, isNaN(v) ? 0.5 : v))
}
