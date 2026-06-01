'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { useABTestStore, type ABTestPersona } from '@/lib/abtest-store'
import { useLocaleStore } from '@/lib/locale-store'

const OCEAN_LABELS: Record<string, string> = {
  openness: '开放性',
  conscientiousness: '尽责性',
  extraversion: '外向性',
  agreeableness: '宜人性',
  neuroticism: '神经质',
}

const BIAS_LABELS: Record<string, string> = {
  noveltyResistance: '新事物抵触',
  authorityDeference: '权威服从',
  lossAversion: '损失厌恶',
  confirmationBias: '确认偏差',
  socialProof: '社会认同',
  anchoring: '锚定效应',
}

export default function ABTestConfigPage() {
  const router = useRouter()
  const locale = useLocaleStore((s) => s.locale)
  const {
    concepts, segments, personas,
    updateConceptName, updateConceptAttribute, addConceptAttribute, removeConceptAttribute,
    updatePersona,
  } = useABTestStore()

  const [expandedConcepts, setExpandedConcepts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(concepts.map(c => [c.id, true]))
  )
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [newPainPoint, setNewPainPoint] = useState<Record<string, string>>({})

  const allPersonas = segments.flatMap(seg => (personas[seg.id] || []).map(p => ({ ...p, segmentId: seg.id, segmentName: seg.name })))
  const selectedPersona = allPersonas.find(p => p.id === selectedPersonaId) || allPersonas[0] || null

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

  function updatePersonaField(segmentId: string, personaId: string, field: string, value: unknown) {
    const persona = personas[segmentId]?.find(p => p.id === personaId)
    if (!persona) return
    updatePersona(segmentId, personaId, { [field]: value } as Partial<ABTestPersona>)
  }

  function updateOcean(segmentId: string, personaId: string, trait: string, value: number) {
    const persona = personas[segmentId]?.find(p => p.id === personaId)
    if (!persona) return
    updatePersona(segmentId, personaId, { ocean: { ...persona.ocean, [trait]: value } })
  }

  function updateBias(segmentId: string, personaId: string, bias: string, value: number) {
    const persona = personas[segmentId]?.find(p => p.id === personaId)
    if (!persona) return
    updatePersona(segmentId, personaId, { biases: { ...persona.biases, [bias]: value } })
  }

  function addPainPoint(segmentId: string, personaId: string) {
    const key = `${segmentId}-${personaId}`
    const text = newPainPoint[key]?.trim()
    if (!text) return
    const persona = personas[segmentId]?.find(p => p.id === personaId)
    if (!persona) return
    updatePersona(segmentId, personaId, { painPoints: [...persona.painPoints, text] })
    setNewPainPoint(prev => ({ ...prev, [key]: '' }))
  }

  function removePainPoint(segmentId: string, personaId: string, index: number) {
    const persona = personas[segmentId]?.find(p => p.id === personaId)
    if (!persona) return
    updatePersona(segmentId, personaId, { painPoints: persona.painPoints.filter((_, i) => i !== index) })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{locale === 'en' ? 'Review Concepts & Personas' : '审核方案 & 画像'}</h1>
          <p className="text-sm text-muted-foreground mt-1">{locale === 'en' ? 'Confirm the AI-generated attributes and personas. You can edit them before evaluation.' : '确认 AI 生成的属性拆解和用户画像，可直接编辑微调'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左栏：方案信息 */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">方案信息</Label>
            {concepts.map((concept, i) => (
              <div key={concept.id} className="rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedConcepts(prev => ({ ...prev, [concept.id]: !prev[concept.id] }))}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{String.fromCharCode(65 + i)}</Badge>
                    <span className="text-sm font-medium">{concept.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{expandedConcepts[concept.id] ? '收起' : '展开'}</span>
                </button>

                {expandedConcepts[concept.id] && (
                  <div className="p-4 space-y-4">
                    {/* 名称编辑 */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">方案名称</Label>
                      <Input
                        value={concept.name}
                        onChange={(e) => updateConceptName(concept.id, e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>

                    {/* 原文预览 */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">原文内容</Label>
                      <div
                        className="tiptap rounded-md border border-border/50 bg-muted/20 p-3 max-h-48 overflow-y-auto text-xs"
                        dangerouslySetInnerHTML={{ __html: concept.description }}
                      />
                    </div>

                    {/* 属性拆解 */}
                    <div className="space-y-2">
                      <Label className="text-[11px] text-muted-foreground">属性拆解</Label>
                      <div className="space-y-1.5">
                        {concept.attributes.map(attr => (
                          <div key={attr.id} className="flex items-center gap-2">
                            <Input
                              value={attr.key}
                              onChange={(e) => updateConceptAttribute(concept.id, attr.id, 'key', e.target.value)}
                              placeholder="属性名"
                              className="text-xs h-7 w-24 shrink-0"
                            />
                            <Input
                              value={attr.value}
                              onChange={(e) => updateConceptAttribute(concept.id, attr.id, 'value', e.target.value)}
                              placeholder="具体值"
                              className="text-xs h-7 flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => removeConceptAttribute(concept.id, attr.id)}
                              className="text-muted-foreground hover:text-destructive text-xs shrink-0"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addConceptAttribute(concept.id)}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        + 添加属性
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 右栏：人物画像 — 左目录 + 右详情 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">人物画像</Label>
            {allPersonas.length === 0 ? (
              <p className="text-xs text-muted-foreground">画像生成中或无数据...</p>
            ) : (
              <div className="flex gap-3 rounded-lg border border-border overflow-hidden min-h-[400px]">
                {/* 左侧目录 */}
                <div className="w-36 shrink-0 border-r border-border bg-muted/20 overflow-y-auto">
                  {segments.map(segment => {
                    const segPersonas = personas[segment.id] || []
                    if (segPersonas.length === 0) return null
                    return (
                      <div key={segment.id}>
                        {segPersonas.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPersonaId(p.id)}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors border-l-2 ${
                              (selectedPersona?.id === p.id)
                                ? 'border-l-primary bg-primary/5 text-foreground font-medium'
                                : 'border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            }`}
                          >
                            <div className="truncate">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{p.decisionStyle}</div>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>

                {/* 右侧详情 */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {selectedPersona ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{selectedPersona.segmentName}</Badge>
                      </div>

                      {/* 基础信息 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">姓名</Label>
                          <Input
                            value={selectedPersona.name}
                            onChange={(e) => updatePersonaField(selectedPersona.segmentId, selectedPersona.id, 'name', e.target.value)}
                            className="text-xs h-7"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">决策风格</Label>
                          <Input
                            value={selectedPersona.decisionStyle}
                            onChange={(e) => updatePersonaField(selectedPersona.segmentId, selectedPersona.id, 'decisionStyle', e.target.value)}
                            className="text-xs h-7"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">月预算</Label>
                          <Input
                            value={selectedPersona.monthlyBudget}
                            onChange={(e) => updatePersonaField(selectedPersona.segmentId, selectedPersona.id, 'monthlyBudget', e.target.value)}
                            className="text-xs h-7"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">当前方案</Label>
                          <Input
                            value={selectedPersona.currentSolution}
                            onChange={(e) => updatePersonaField(selectedPersona.segmentId, selectedPersona.id, 'currentSolution', e.target.value)}
                            className="text-xs h-7"
                          />
                        </div>
                      </div>

                      {/* 背景 - 大输入框 */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">背景</Label>
                        <Textarea
                          value={selectedPersona.background}
                          onChange={(e) => updatePersonaField(selectedPersona.segmentId, selectedPersona.id, 'background', e.target.value)}
                          className="text-xs min-h-[60px]"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">性格</Label>
                        <Input
                          value={selectedPersona.personality}
                          onChange={(e) => updatePersonaField(selectedPersona.segmentId, selectedPersona.id, 'personality', e.target.value)}
                          className="text-xs h-7"
                        />
                      </div>

                      {/* 痛点 */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">痛点</Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedPersona.painPoints.map((point, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] cursor-pointer hover:bg-destructive/10" onClick={() => removePainPoint(selectedPersona.segmentId, selectedPersona.id, idx)}>
                              {point} ×
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <Input
                            value={newPainPoint[`${selectedPersona.segmentId}-${selectedPersona.id}`] || ''}
                            onChange={(e) => setNewPainPoint(prev => ({ ...prev, [`${selectedPersona.segmentId}-${selectedPersona.id}`]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPainPoint(selectedPersona.segmentId, selectedPersona.id) } }}
                            placeholder="添加痛点..."
                            className="text-[10px] h-6 flex-1"
                          />
                        </div>
                      </div>

                      {/* OCEAN + Biases 双栏 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground font-medium">OCEAN 五大人格</Label>
                          {Object.entries(OCEAN_LABELS).map(([key, label]) => (
                            <div key={key} className="flex items-center gap-1.5">
                              <span className="text-[9px] text-muted-foreground w-10 shrink-0">{label}</span>
                              <Slider
                                value={[selectedPersona.ocean[key as keyof typeof selectedPersona.ocean]]}
                                onValueChange={(v) => updateOcean(selectedPersona.segmentId, selectedPersona.id, key, Array.isArray(v) ? v[0] : v)}
                                min={0}
                                max={100}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-[9px] text-muted-foreground w-5 text-right">{selectedPersona.ocean[key as keyof typeof selectedPersona.ocean]}</span>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground font-medium">认知偏差</Label>
                          {Object.entries(BIAS_LABELS).map(([key, label]) => (
                            <div key={key} className="flex items-center gap-1.5">
                              <span className="text-[9px] text-muted-foreground w-12 shrink-0">{label}</span>
                              <Slider
                                value={[selectedPersona.biases[key as keyof typeof selectedPersona.biases]]}
                                onValueChange={(v) => updateBias(selectedPersona.segmentId, selectedPersona.id, key, Array.isArray(v) ? v[0] : v)}
                                min={0}
                                max={100}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-[9px] text-muted-foreground w-5 text-right">{selectedPersona.biases[key as keyof typeof selectedPersona.biases]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">选择左侧人物查看详情</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部导航 */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => router.push('/')} className="flex-1">
            上一步
          </Button>
          <Button onClick={() => router.push('/abtest/eval-config')} className="flex-1">
            下一步
          </Button>
        </div>
      </div>
    </div>
  )
}
