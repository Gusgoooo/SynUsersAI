'use client'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { SimAgent } from '@/lib/simulation-store'
import { useLocaleStore } from '@/lib/locale-store'

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
    consumption: '消费习惯',
    cognitiveStyle: '认知方式',
    languageRegister: '语言风格',
    sourceAnchors: '来源锚点',
    viewParams: '查看完整认知参数',
    dialogTitle: '认知科学参数',
    oceanTitle: 'OCEAN 大五人格模型',
    biasesTitle: '认知偏见参数',
    explanation: '这些参数会随对话进行实时变化，模拟人类在社交互动中的心理动态演化。情绪链（Chain-of-Feeling）系统基于认知失调实时更新情绪状态，OCEAN 人格决定情绪反应模式，偏见参数影响每次发言的认知过滤方向。',
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
    consumption: 'Consumption habits',
    cognitiveStyle: 'Cognitive style',
    languageRegister: 'Language register',
    sourceAnchors: 'Source anchors',
    viewParams: 'View full persona parameters',
    dialogTitle: 'persona parameters',
    oceanTitle: 'OCEAN Big Five Model',
    biasesTitle: 'Cognitive Bias Parameters',
    explanation: 'These parameters evolve during the conversation to approximate social and psychological dynamics. The emotion layer reacts to cognitive dissonance, OCEAN traits shape response patterns, and bias parameters influence how each agent filters new information.',
  },
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

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 flex flex-col h-full">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">{agent.name}</h3>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {agent.tags.map((tag) => (
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
          {agent.sourceSummary && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-foreground/70">{copy.sourceSummary}</span>{agent.sourceSummary}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5 text-xs">
        <div>
          <span className="text-muted-foreground">{copy.personality}</span>
          <span>{agent.personality}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{copy.stance}</span>
          <span className="italic">{agent.stance}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{copy.speakingStyle}</span>
          <span>{agent.speakingStyle}</span>
        </div>
      </div>

      {memory && (
        <div className="border-t pt-2 space-y-1.5">
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{copy.memoryTitle}</p>
          {memory.consumptionHabits.slice(0, 2).map((habit) => (
            <p key={habit} className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="text-foreground/70">{copy.consumption}: </span>{habit}
            </p>
          ))}
          {memory.educationCognitiveStyle && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="text-foreground/70">{copy.cognitiveStyle}: </span>{memory.educationCognitiveStyle}
            </p>
          )}
          {memory.languageRegister && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="text-foreground/70">{copy.languageRegister}: </span>{memory.languageRegister}
            </p>
          )}
        </div>
      )}

      {/* OCEAN bars — always visible */}
      {ocean && (
        <div className="border-t pt-2 space-y-1">
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{copy.ocean}</p>
          {oceanItems.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-28 shrink-0">{label}</span>
              <MiniBar value={ocean[key] ?? 50} color={color} />
              <span className="text-[9px] font-mono text-muted-foreground w-5 text-right">{ocean[key] ?? 50}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs space-y-1.5 border-t pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground shrink-0">{copy.domains}</span>
          {agent.knowledgeDomains.map((d) => (
            <Badge key={d} variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400">
              {d}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground shrink-0">{copy.triggers}</span>
          {agent.triggerKeywords.map((kw) => (
            <Badge key={kw} variant="outline" className="text-[10px] px-1.5 py-0">
              {kw}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground shrink-0">{copy.friction}</span>
          {agent.frictionTopics.map((ft) => (
            <Badge key={ft} variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
              {ft}
            </Badge>
          ))}
        </div>
      </div>

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
              {memory && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {copy.memoryTitle}
                  </h4>
                  {[
                    ...memory.semanticMemory.map((item) => [locale === 'en' ? 'Belief' : '稳定信念', item] as const),
                    ...memory.episodicCompositeMemory.map((item) => [locale === 'en' ? 'Composite memory' : '复合经历', item] as const),
                    ...memory.consumptionHabits.map((item) => [copy.consumption, item] as const),
                    ...memory.emotionalTriggers.map((item) => [locale === 'en' ? 'Emotional trigger' : '情绪触发', item] as const),
                    ...memory.decisionHeuristics.map((item) => [locale === 'en' ? 'Decision rule' : '决策捷径', item] as const),
                  ].slice(0, 10).map(([label, item]) => (
                    <div key={`${label}-${item}`} className="rounded-md bg-muted/40 px-2.5 py-2">
                      <p className="text-[10px] font-medium text-foreground/70">{label}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{item}</p>
                    </div>
                  ))}
                  <div className="grid gap-2">
                    {memory.socialIdentity && (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="text-foreground/70">{locale === 'en' ? 'Social identity: ' : '社会身份：'}</span>{memory.socialIdentity}
                      </p>
                    )}
                    {memory.languageRegister && (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="text-foreground/70">{copy.languageRegister}: </span>{memory.languageRegister}
                      </p>
                    )}
                  </div>
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

              <div className="border-t pt-3">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {copy.explanation}
                </p>
              </div>

              {agent.evidence && agent.evidence.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {copy.sourceAnchors}
                  </h4>
                  {agent.evidence.map((item) => (
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
