'use client'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { SimAgent } from '@/lib/simulation-store'

interface PersonaCardProps {
  agent: SimAgent
}

const CURVE_LABELS: Record<string, string> = {
  steady: '稳定型',
  fading: '渐弱型',
  warming: '渐强型',
  burst: '爆发型',
  erratic: '不可预测',
}

const OCEAN_ITEMS = [
  { key: 'openness', label: 'O 开放性', color: 'bg-purple-500' },
  { key: 'conscientiousness', label: 'C 尽责性', color: 'bg-blue-500' },
  { key: 'extraversion', label: 'E 外向性', color: 'bg-green-500' },
  { key: 'agreeableness', label: 'A 顺和性', color: 'bg-yellow-500' },
  { key: 'neuroticism', label: 'N 神经质', color: 'bg-red-500' },
] as const

const BIAS_ITEMS = [
  { key: 'noveltyResistance', label: '新事物怀疑', desc: '对未经验证事物的本能排斥' },
  { key: 'authorityDeference', label: '权威信任', desc: '对权威来源的信任程度' },
  { key: 'lossAversion', label: '损失厌恶', desc: '对权益被剥夺的敏感度' },
  { key: 'confirmationBias', label: '确认偏误', desc: '只接受符合已有观点信息的倾向' },
  { key: 'socialProof', label: '从众倾向', desc: '被多数人意见影响的程度' },
  { key: 'anchoring', label: '锚定效应', desc: '第一印象对后续判断的锁定力' },
] as const

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
          {CURVE_LABELS[agent.engagementCurve] || agent.engagementCurve}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {agent.background}
      </p>

      <div className="space-y-1.5 text-xs">
        <div>
          <span className="text-muted-foreground">性格：</span>
          <span>{agent.personality}</span>
        </div>
        <div>
          <span className="text-muted-foreground">立场：</span>
          <span className="italic">{agent.stance}</span>
        </div>
        <div>
          <span className="text-muted-foreground">说话风格：</span>
          <span>{agent.speakingStyle}</span>
        </div>
      </div>

      {/* OCEAN bars — always visible */}
      {ocean && (
        <div className="border-t pt-2 space-y-1">
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-1">OCEAN 人格</p>
          {OCEAN_ITEMS.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-14 shrink-0">{label}</span>
              <MiniBar value={ocean[key] ?? 50} color={color} />
              <span className="text-[9px] font-mono text-muted-foreground w-5 text-right">{ocean[key] ?? 50}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs space-y-1.5 border-t pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground shrink-0">擅长：</span>
          {agent.knowledgeDomains.map((d) => (
            <Badge key={d} variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400">
              {d}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground shrink-0">触发词：</span>
          {agent.triggerKeywords.map((kw) => (
            <Badge key={kw} variant="outline" className="text-[10px] px-1.5 py-0">
              {kw}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground shrink-0">雷区：</span>
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
            查看完整认知参数
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{agent.name} — 认知科学参数</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  OCEAN 大五人格模型
                </h4>
                {ocean && OCEAN_ITEMS.map(({ key, label, color }) => (
                  <DetailBar
                    key={key}
                    label={label}
                    desc={key === 'openness' ? '对新体验的接受程度' :
                          key === 'conscientiousness' ? '做事的条理性和自律性' :
                          key === 'extraversion' ? '社交能量和表达欲' :
                          key === 'agreeableness' ? '合作倾向 vs 对抗倾向' :
                          '情绪波动幅度和频率'}
                    value={ocean[key] ?? 50}
                    color={color}
                  />
                ))}
              </div>

              <div className="border-t pt-3 space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  认知偏见参数
                </h4>
                {agent.biases && BIAS_ITEMS.map(({ key, label, desc }) => (
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
                  这些参数会随对话进行实时变化，模拟人类在社交互动中的心理动态演化。情绪链（Chain-of-Feeling）系统基于认知失调实时更新情绪状态，OCEAN 人格决定情绪反应模式，偏见参数影响每次发言的认知过滤方向。
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
