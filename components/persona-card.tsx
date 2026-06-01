'use client'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { SimAgent } from '@/lib/simulation-store'
import { useLocaleStore } from '@/lib/locale-store'
import type { MemoryProfile, TopicExposureLevel, TopicResearchGrounding } from '@/lib/persona/types'

interface PersonaCardProps {
  agent: SimAgent
}

const CURVE_LABELS = {
  zh: {
    steady: '稳定型',
    fading: '渐弱型',
    warming: '渐强型',
    burst: '爆发型',
    erratic: '不可预测',
  },
  en: {
    steady: 'Steady',
    fading: 'Fading',
    warming: 'Warming',
    burst: 'Burst',
    erratic: 'Erratic',
  },
}

const OCEAN_ITEMS = {
  zh: [
    { key: 'openness', label: 'O 开放性', desc: '对新体验的接受程度', color: 'bg-purple-500' },
    { key: 'conscientiousness', label: 'C 尽责性', desc: '做事的条理性和自律性', color: 'bg-blue-500' },
    { key: 'extraversion', label: 'E 外向性', desc: '社交能量和表达欲', color: 'bg-green-500' },
    { key: 'agreeableness', label: 'A 顺和性', desc: '合作倾向 vs 对抗倾向', color: 'bg-yellow-500' },
    { key: 'neuroticism', label: 'N 神经质', desc: '情绪波动幅度和频率', color: 'bg-red-500' },
  ],
  en: [
    { key: 'openness', label: 'O Openness', desc: 'Tolerance for novelty and new experiences', color: 'bg-purple-500' },
    { key: 'conscientiousness', label: 'C Conscientiousness', desc: 'Order, self-discipline, and planning', color: 'bg-blue-500' },
    { key: 'extraversion', label: 'E Extraversion', desc: 'Social energy and willingness to speak', color: 'bg-green-500' },
    { key: 'agreeableness', label: 'A Agreeableness', desc: 'Cooperative vs. confrontational tendency', color: 'bg-yellow-500' },
    { key: 'neuroticism', label: 'N Neuroticism', desc: 'Emotional volatility and stress reactivity', color: 'bg-red-500' },
  ],
} as const

const BIAS_ITEMS = {
  zh: [
    { key: 'noveltyResistance', label: '新事物怀疑', desc: '对未经验证事物的本能排斥' },
    { key: 'authorityDeference', label: '权威信任', desc: '对权威来源的信任程度' },
    { key: 'lossAversion', label: '损失厌恶', desc: '对权益被剥夺的敏感度' },
    { key: 'confirmationBias', label: '确认偏误', desc: '只接受符合已有观点信息的倾向' },
    { key: 'socialProof', label: '从众倾向', desc: '被多数人意见影响的程度' },
    { key: 'anchoring', label: '锚定效应', desc: '第一印象对后续判断的锁定力' },
  ],
  en: [
    { key: 'noveltyResistance', label: 'Novelty resistance', desc: 'Instinctive skepticism toward unproven things' },
    { key: 'authorityDeference', label: 'Authority trust', desc: 'How much authority sources affect judgment' },
    { key: 'lossAversion', label: 'Loss aversion', desc: 'Sensitivity to losing money, access, or control' },
    { key: 'confirmationBias', label: 'Confirmation bias', desc: 'Preference for information that confirms prior views' },
    { key: 'socialProof', label: 'Social proof', desc: 'Influence from majority behavior and peer adoption' },
    { key: 'anchoring', label: 'Anchoring', desc: 'How strongly first impressions shape later judgment' },
  ],
} as const

const EXPOSURE_LABELS: Record<'zh' | 'en', Record<TopicExposureLevel, string>> = {
  zh: {
    unaware: '陌生',
    aware: '听过',
    informed: '了解',
    expert: '熟悉',
  },
  en: {
    unaware: 'Unaware',
    aware: 'Aware',
    informed: 'Informed',
    expert: 'Expert',
  },
}

const GROUNDING_LABELS: Record<'zh' | 'en', Record<TopicResearchGrounding, string>> = {
  zh: {
    web: '联网',
    mixed: '联网+人设',
    user: '用户资料',
    inferred: '人设推断',
  },
  en: {
    web: 'Web',
    mixed: 'Web + persona',
    user: 'User material',
    inferred: 'Persona-inferred',
  },
}

const COPY = {
  zh: {
    personality: '性格：',
    stance: '立场：',
    speakingStyle: '说话风格：',
    ocean: 'OCEAN 人格',
    domains: '擅长：',
    triggers: '触发词：',
    friction: '雷区：',
    sourceSummary: '来源模式：',
    grounding: '记忆可信度',
    memoryTitle: '内在记忆系统',
    summaryTitle: '摘要',
    memorySubtitle: '来源材料已经被蒸馏为发言背后的判断结构',
    grounded: '来源支撑',
    inferred: '描述推断',
    noMemory: '未生成记忆蒸馏',
    semantic: '语义记忆',
    episodic: '复合经历记忆',
    consumption: '消费习惯',
    cognitiveStyle: '认知方式',
    socialIdentity: '社会身份',
    emotionalTriggers: '情绪触发点',
    languageRegister: '语言风格',
    decisionHeuristics: '决策捷径',
    sourceAnchors: '来源锚点',
    sourceAnchorsHint: '后台用于追溯，不要求 AI 在聊天中直接引用',
    viewParams: '展开更多',
    dialogTitle: '人设详情与记忆蒸馏',
    oceanTitle: 'OCEAN 大五人格模型',
    biasesTitle: '认知偏见参数',
    mechanismTitle: '产品内如何生效',
    mechanism: '聊天时会把这些记忆作为私有上下文激活，影响措辞、例子、风险感、购买逻辑和情绪反应；前台不强制引用来源，后台保留锚点和激活记录。',
    detailsTitle: '基础画像',
    topicRelationTitle: '当前议题交叉',
    topicFamiliarity: '了解程度',
    topicRelevance: '相关度',
    likelyKnown: '大概率知道',
    likelyMisread: '可能误解/不知道',
    decisionAngles: '判断入口',
    visibleTraits: '话题中显露的特点',
  },
  en: {
    personality: 'Personality: ',
    stance: 'Stance: ',
    speakingStyle: 'Speaking style: ',
    ocean: 'OCEAN traits',
    domains: 'Domains: ',
    triggers: 'Triggers: ',
    friction: 'Friction: ',
    sourceSummary: 'Source pattern: ',
    grounding: 'Memory grounding',
    memoryTitle: 'Internal Memory System',
    summaryTitle: 'Summary',
    memorySubtitle: 'Source material distilled into the judgment structure behind speech',
    grounded: 'Source-backed',
    inferred: 'Description-inferred',
    noMemory: 'No memory distillation',
    semantic: 'Semantic memory',
    episodic: 'Composite experience memory',
    consumption: 'Consumption habits',
    cognitiveStyle: 'Cognitive style',
    socialIdentity: 'Social identity',
    emotionalTriggers: 'Emotional triggers',
    languageRegister: 'Language register',
    decisionHeuristics: 'Decision heuristics',
    sourceAnchors: 'Source anchors',
    sourceAnchorsHint: 'Used for backend traceability; the AI should not cite them in chat',
    viewParams: 'Expand details',
    dialogTitle: 'persona details and memory distillation',
    oceanTitle: 'OCEAN Big Five Model',
    biasesTitle: 'Cognitive Bias Parameters',
    mechanismTitle: 'How it works in product',
    mechanism: 'During chat, these memories are activated as private context. They shape wording, examples, risk tolerance, buying logic, and emotional reaction; the frontend avoids forced citations while backend anchors remain traceable.',
    detailsTitle: 'Persona basics',
    topicRelationTitle: 'Current Topic Fit',
    topicFamiliarity: 'Familiarity',
    topicRelevance: 'Relevance',
    likelyKnown: 'Likely knows',
    likelyMisread: 'May misunderstand/not know',
    decisionAngles: 'Decision angles',
    visibleTraits: 'Traits in this topic',
  },
}

function hasMemoryContent(memory?: MemoryProfile) {
  if (!memory) return false
  return Boolean(
    asItems(memory.semanticMemory).length ||
    asItems(memory.episodicCompositeMemory).length ||
    asItems(memory.consumptionHabits).length ||
    memory.educationCognitiveStyle ||
    memory.socialIdentity ||
    asItems(memory.emotionalTriggers).length ||
    memory.languageRegister ||
    asItems(memory.decisionHeuristics).length
  )
}

function asItems(value: string | string[] | undefined) {
  if (!value) return []
  return Array.isArray(value) ? uniqueStrings(value) : uniqueStrings([value])
}

function uniqueStrings(items: Array<string | undefined | null>, limit?: number) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of items) {
    const normalized = String(item || '').trim()
    if (!normalized) continue
    const key = normalized.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
    if (limit && result.length >= limit) break
  }

  return result
}

function uniqueEvidence<T extends { evidenceId?: string; quote?: string; sourceName?: string; locator?: string }>(items: T[] | undefined) {
  const seen = new Set<string>()
  const result: T[] = []

  for (const item of items || []) {
    const key = item.evidenceId || `${item.sourceName || ''}:${item.locator || ''}:${item.quote || ''}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }

  return result
}

function MemorySection({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null

  return (
    <div className="rounded-md border bg-background/60 p-2.5 space-y-1.5">
      <p className="text-[10px] font-medium text-foreground/70">{label}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-[11px] leading-relaxed text-muted-foreground">
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  )
}

function DetailBar({ label, desc, value, color }: { label: string; desc: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-foreground">{label}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <p className="text-[9px] text-muted-foreground">{desc}</p>
    </div>
  )
}

export function PersonaCard({ agent }: PersonaCardProps) {
  const ocean = agent.ocean as unknown as Record<string, number> | undefined
  const locale = useLocaleStore((s) => s.locale)
  const copy = COPY[locale]
  const oceanItems = OCEAN_ITEMS[locale]
  const biasItems = BIAS_ITEMS[locale]
  const memory = agent.memoryProfile
  const topicRelation = agent.topicRelation
  const hasMemory = hasMemoryContent(memory)
  const isSourceBacked = Boolean(agent.evidence?.length || agent.sourceSummary || typeof agent.dataGroundingScore === 'number')
  const groundingLabel = hasMemory ? (isSourceBacked ? copy.grounded : copy.inferred) : copy.noMemory
  const tags = uniqueStrings(agent.tags, 4)
  const knowledgeDomains = uniqueStrings(agent.knowledgeDomains)
  const triggerKeywords = uniqueStrings(agent.triggerKeywords)
  const frictionTopics = uniqueStrings(agent.frictionTopics)
  const evidence = uniqueEvidence(agent.evidence)
  const semanticMemories = asItems(memory?.semanticMemory)
  const compositeMemories = asItems(memory?.episodicCompositeMemory)
  const consumptionHabits = asItems(memory?.consumptionHabits)
  const emotionalTriggers = asItems(memory?.emotionalTriggers)
  const decisionHeuristics = asItems(memory?.decisionHeuristics)
  const summaryItems = [
    [copy.personality, agent.personality],
    [copy.stance, agent.stance],
    [copy.consumption, consumptionHabits[0]],
  ].filter(([, item]) => Boolean(item)).slice(0, 2)

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 flex flex-col h-full">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">{agent.name}</h3>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] shrink-0">
          {CURVE_LABELS[locale][agent.engagementCurve] || agent.engagementCurve}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {agent.background}
      </p>

      {topicRelation && (
        <div className="rounded-md border bg-background/50 px-2.5 py-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{copy.topicRelationTitle}</p>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {GROUNDING_LABELS[locale][topicRelation.researchGrounding]}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[10px] text-muted-foreground">{copy.topicFamiliarity}</span>
              <MiniBar value={topicRelation.familiarity} color="bg-sky-500" />
              <span className="text-[10px] font-mono text-muted-foreground">{topicRelation.familiarity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[10px] text-muted-foreground">{copy.topicRelevance}</span>
              <MiniBar value={topicRelation.relevance} color="bg-emerald-500" />
              <span className="text-[10px] font-mono text-muted-foreground">{topicRelation.relevance}</span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {EXPOSURE_LABELS[locale][topicRelation.exposureLevel]} · {topicRelation.relationSummary}
          </p>
        </div>
      )}

      {(agent.sourceSummary || typeof agent.dataGroundingScore === 'number') && (
        <div className="rounded-md border bg-background/50 px-2.5 py-2 space-y-1">
          {typeof agent.dataGroundingScore === 'number' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0">{copy.grounding}</span>
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${agent.dataGroundingScore}%` }} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{agent.dataGroundingScore}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5 text-xs border-t pt-2">
        <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{copy.summaryTitle}</p>
        {summaryItems.map(([label, item]) => (
          <p key={`${label}-${item}`} className="leading-relaxed">
            <span className="text-muted-foreground">{label}</span>
            <span>{item}</span>
          </p>
        ))}
      </div>

      {hasMemory && memory && (
        <div className="border-t pt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{copy.memoryTitle}</p>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {groundingLabel}
            </Badge>
          </div>
          {[
            [copy.consumption, consumptionHabits[0]],
            [copy.languageRegister, memory.languageRegister],
          ].filter(([, item]) => Boolean(item)).slice(0, 2).map(([label, item]) => (
            <p key={`${label}-${item}`} className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="text-foreground/70">{label}: </span>{item}
            </p>
          ))}
        </div>
      )}

      {/* Full params modal */}
      <div className="border-t pt-2 mt-auto">
        <Dialog>
          <DialogTrigger className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background h-7 px-3 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            {copy.viewParams}
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{agent.name} — {copy.dialogTitle}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="rounded-md border bg-background/60 p-3 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.detailsTitle}
                </h4>
                {agent.sourceSummary && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    <span className="text-foreground/70">{copy.sourceSummary}</span>{agent.sourceSummary}
                  </p>
                )}
                <div className="space-y-1.5 text-xs">
                  <p>
                    <span className="text-muted-foreground">{copy.personality}</span>
                    <span>{agent.personality}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{copy.stance}</span>
                    <span className="italic">{agent.stance}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{copy.speakingStyle}</span>
                    <span>{agent.speakingStyle}</span>
                  </p>
                </div>
              </div>

              {topicRelation && (
                <div className="rounded-md border bg-background/60 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {copy.topicRelationTitle}
                    </h4>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {GROUNDING_LABELS[locale][topicRelation.researchGrounding]}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {EXPOSURE_LABELS[locale][topicRelation.exposureLevel]} · {topicRelation.relationSummary}
                  </p>
                  <DetailBar
                    label={copy.topicFamiliarity}
                    desc={topicRelation.privateInstruction}
                    value={topicRelation.familiarity}
                    color="bg-sky-500"
                  />
                  <DetailBar
                    label={copy.topicRelevance}
                    desc={topicRelation.decisionAngles.slice(0, 2).join(locale === 'en' ? ', ' : '、')}
                    value={topicRelation.relevance}
                    color="bg-emerald-500"
                  />
                  <div className="space-y-2">
                    <MemorySection label={copy.likelyKnown} items={asItems(topicRelation.likelyKnownFacts)} />
                    <MemorySection label={copy.likelyMisread} items={asItems(topicRelation.likelyMisunderstandings)} />
                    <MemorySection label={copy.decisionAngles} items={asItems(topicRelation.decisionAngles)} />
                    <MemorySection label={copy.visibleTraits} items={asItems(topicRelation.visibleTraits)} />
                  </div>
                </div>
              )}

              <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {copy.memoryTitle}
                    </h4>
                    <p className="text-[10px] leading-relaxed text-muted-foreground">{copy.memorySubtitle}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {groundingLabel}
                  </Badge>
                </div>
                {typeof agent.dataGroundingScore === 'number' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-muted-foreground shrink-0">{copy.grounding}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${agent.dataGroundingScore}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{agent.dataGroundingScore}</span>
                  </div>
                )}
              </div>

              {hasMemory && memory && (
                <div className="space-y-2.5">
                  <MemorySection label={copy.semantic} items={semanticMemories} />
                  <MemorySection label={copy.episodic} items={compositeMemories} />
                  <MemorySection label={copy.consumption} items={consumptionHabits} />
                  <MemorySection label={copy.cognitiveStyle} items={asItems(memory.educationCognitiveStyle)} />
                  <MemorySection label={copy.socialIdentity} items={asItems(memory.socialIdentity)} />
                  <MemorySection label={copy.emotionalTriggers} items={emotionalTriggers} />
                  <MemorySection label={copy.languageRegister} items={asItems(memory.languageRegister)} />
                  <MemorySection label={copy.decisionHeuristics} items={decisionHeuristics} />
                </div>
              )}

              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.oceanTitle}
                </h4>
                {ocean && oceanItems.map(({ key, label, desc, color }) => (
                  <DetailBar
                    key={key}
                    label={label}
                    desc={desc}
                    value={ocean[key] ?? 50}
                    color={color}
                  />
                ))}
              </div>

              <div className="border-t pt-3 space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.biasesTitle}
                </h4>
                {agent.biases && biasItems.map(({ key, label, desc }) => (
                  <DetailBar
                    key={key}
                    label={label}
                    desc={desc}
                    value={(agent.biases as unknown as Record<string, number>)[key] ?? 50}
                    color="bg-foreground/40"
                  />
                ))}
              </div>

              <div className="border-t pt-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-muted-foreground shrink-0">{copy.domains}</span>
                  {knowledgeDomains.map((d) => (
                    <Badge key={d} variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400">
                      {d}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-muted-foreground shrink-0">{copy.triggers}</span>
                  {triggerKeywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-[10px] px-1.5 py-0">
                      {kw}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-muted-foreground shrink-0">{copy.friction}</span>
                  {frictionTopics.map((ft) => (
                    <Badge key={ft} variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
                      {ft}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3 space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.mechanismTitle}
                </h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {copy.mechanism}
                </p>
              </div>

              {evidence.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {copy.sourceAnchors}
                  </h4>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{copy.sourceAnchorsHint}</p>
                  {evidence.map((item) => (
                    <div key={item.evidenceId} className="rounded-md border bg-background/60 p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{item.evidenceId}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{item.weight}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">"{item.quote}"</p>
                      {item.reason && <p className="text-[10px] text-muted-foreground">{item.reason}</p>}
                      <p className="text-[9px] text-muted-foreground">
                        {item.sourceName} · {item.locator}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
