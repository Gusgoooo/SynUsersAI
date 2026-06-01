'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useABTestStore } from '@/lib/abtest-store'
import { useLocaleStore } from '@/lib/locale-store'

const PRESET_DIMENSIONS = ['易用性', '价值感', '购买意愿', '信任度', '差异化', '创新性', '性价比', '切换意愿', '推荐意愿']

const SCENARIO_OPTIONS = [
  { id: 'friend', label: '朋友/同事推荐', desc: '社交信任场景，口碑传播' },
  { id: 'ad', label: '信息流广告', desc: '冷接触，用户无预期' },
  { id: 'search', label: '主动搜索替代方案', desc: '用户有明确需求，在比较' },
  { id: 'mandate', label: '公司统一采购', desc: '被动接受，关注学习成本' },
  { id: 'custom', label: '自定义场景', desc: '' },
]

const PROTOCOL_OPTIONS = [
  { id: 'sequential', label: '依次评估 + 强制选择', desc: '每人看所有方案再做选择（默认）' },
  { id: 'monadic', label: '独立评估', desc: '每人只看一个方案，无对比干扰' },
]

export default function EvalConfigPage() {
  const router = useRouter()
  const { concepts, segments, dimensions, agentCount, setDimensions, setEvalConfig, setStatus } = useABTestStore()
  const locale = useLocaleStore((s) => s.locale)
  const [customDim, setCustomDim] = useState('')
  const [scenario, setScenario] = useState('friend')
  const [customScenario, setCustomScenario] = useState('')
  const [decisionCriteria, setDecisionCriteria] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [hypothesis, setHypothesis] = useState('')
  const [protocol, setProtocol] = useState('sequential')

  if (concepts.length === 0 || !concepts[0].name) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{locale === 'en' ? 'Please add concept content first' : '请先填写方案内容'}</p>
          <Button onClick={() => router.push('/')}>{locale === 'en' ? 'Back home' : '返回首页'}</Button>
        </div>
      </div>
    )
  }

  function toggleDimension(dim: string) {
    if (dimensions.includes(dim)) {
      setDimensions(dimensions.filter(d => d !== dim))
    } else {
      setDimensions([...dimensions, dim])
    }
  }

  function addCustomDimension() {
    if (!customDim.trim() || dimensions.includes(customDim.trim())) return
    setDimensions([...dimensions, customDim.trim()])
    setCustomDim('')
  }

  function handleStart() {
    setEvalConfig({
      scenario,
      customScenario,
      decisionCriteria,
      hypothesis,
      protocol: protocol as 'sequential' | 'monadic',
    })
    setStatus('running')
    router.push('/abtest/process')
  }

  const canStart = dimensions.length > 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">评估设置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {concepts.map(c => c.name).join(' vs ')} · {segments.map(s => s.name).join('、')}
          </p>
        </div>

        {/* 评估维度 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">评估维度</Label>
          <p className="text-[11px] text-muted-foreground">选择关注的评估维度，AI 将从这些角度对方案进行深度评价</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_DIMENSIONS.map((dim) => (
              <Badge
                key={dim}
                variant={dimensions.includes(dim) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => toggleDimension(dim)}
              >
                {dim}
              </Badge>
            ))}
            {dimensions.filter(d => !PRESET_DIMENSIONS.includes(d)).map((dim) => (
              <Badge
                key={dim}
                variant="default"
                className="cursor-pointer text-xs"
                onClick={() => toggleDimension(dim)}
              >
                {dim} ×
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={customDim}
              onChange={(e) => setCustomDim(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomDimension() } }}
              placeholder="自定义维度..."
              className="text-xs h-8"
            />
            <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={addCustomDimension}>
              添加
            </Button>
          </div>
        </div>

        {/* 触达场景 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">触达场景</Label>
          <p className="text-[11px] text-muted-foreground">用户如何接触到这个方案？不同场景会显著影响评估结果</p>
          <div className="grid gap-2">
            {SCENARIO_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                  scenario === opt.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 border border-transparent hover:bg-muted'
                }`}
              >
                <input
                  type="radio"
                  name="scenario"
                  value={opt.id}
                  checked={scenario === opt.id}
                  onChange={() => setScenario(opt.id)}
                  className="sr-only"
                />
                <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                  scenario === opt.id ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                }`} />
                <div>
                  <span className="text-xs font-medium">{opt.label}</span>
                  {opt.desc && <span className="text-[11px] text-muted-foreground ml-2">{opt.desc}</span>}
                </div>
              </label>
            ))}
          </div>
          {scenario === 'custom' && (
            <Textarea
              value={customScenario}
              onChange={(e) => setCustomScenario(e.target.value)}
              placeholder="描述用户接触方案的具体场景..."
              rows={2}
              className="text-xs"
            />
          )}
        </div>

        {/* 决策标准 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">决策标准</Label>
          <p className="text-[11px] text-muted-foreground">预先定义"什么算赢"，避免看到结果后找理由（可选）</p>
          <Input
            value={decisionCriteria}
            onChange={(e) => setDecisionCriteria(e.target.value)}
            placeholder="例：购买意愿均分差 > 1.5 则选该方案；切换意愿 > 60% 才值得继续"
            className="text-xs h-9"
          />
        </div>

        {/* 高级选项 */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? '收起' : '展开'}高级选项
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium">测试假设</Label>
                <Textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="例：我们认为方案A在年轻人群中购买意愿更高，因为定价更符合预期..."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">评估协议</Label>
                <div className="grid gap-2">
                  {PROTOCOL_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                        protocol === opt.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 border border-transparent hover:bg-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="protocol"
                        value={opt.id}
                        checked={protocol === opt.id}
                        onChange={() => setProtocol(opt.id)}
                        className="sr-only"
                      />
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                        protocol === opt.id ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`} />
                      <div>
                        <span className="text-xs font-medium">{opt.label}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">
            {concepts.length} 个方案 × {segments.length} 个人群 × {agentCount} 人/组 = {concepts.length * segments.length * agentCount} 次评估
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            维度：{dimensions.join('、') || '未选择'} · 场景：{SCENARIO_OPTIONS.find(o => o.id === scenario)?.label}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/abtest/config')} className="flex-1">
            上一步
          </Button>
          <Button onClick={handleStart} disabled={!canStart} className="flex-1">
            开始评估
          </Button>
        </div>
      </div>
    </div>
  )
}
