'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { useABTestStore, type ABTestPersona, type EvaluationResult, type ForcedChoiceResult } from '@/lib/abtest-store'

interface LogEntry {
  id: string
  type: 'system' | 'persona' | 'evaluation' | 'choice'
  content: string
  detail?: string
  timestamp: number
}

export default function ABTestProcessPage() {
  const router = useRouter()
  const store = useABTestStore()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const { concepts, segments, dimensions, model, agentCount, evalConfig } = store

  useEffect(() => {
    if (startedRef.current) return
    if (concepts.length === 0 || !concepts[0].name) {
      router.push('/')
      return
    }
    startedRef.current = true
    runEvaluation()
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    setLogs(prev => [...prev, { ...entry, id: crypto.randomUUID(), timestamp: Date.now() }])
  }

  async function runEvaluation() {
    setIsRunning(true)
    store.reset()
    store.setStatus('running')

    addLog({ type: 'system', content: '开始评估流程...' })
    addLog({ type: 'system', content: `${concepts.length} 个方案 × ${segments.length} 个人群 × ${agentCount} 人/组` })

    try {
      const res = await fetch('/api/abtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concepts, segments, dimensions, model, agentCount, evalConfig }),
      })

      if (!res.ok) throw new Error(`API ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6))
              handleEvent(eventType, data)
            } catch {}
            eventType = ''
          }
        }
      }
    } catch (err) {
      setError(String(err))
      addLog({ type: 'system', content: `错误: ${err}` })
    } finally {
      setIsRunning(false)
    }
  }

  function handleEvent(event: string, data: Record<string, unknown>) {
    switch (event) {
      case 'progress': {
        const phase = data.phase as string
        const current = data.current as number
        const total = data.total as number
        store.setProgress({ phase: phase as 'attributes' | 'personas' | 'eval' | 'choice', segmentName: data.segmentName as string | undefined, conceptName: data.conceptName as string | undefined, current, total })

        if (phase === 'attributes') {
          addLog({ type: 'system', content: '正在分析方案属性...' })
        } else if (phase === 'personas') {
          addLog({ type: 'system', content: `正在为「${data.segmentName}」生成用户画像 (${current + 1}/${total})...` })
        } else if (phase === 'eval') {
          store.setProgress({ phase: 'eval', segmentName: data.segmentName as string, conceptName: data.conceptName as string, current, total })
        } else if (phase === 'choice') {
          if (current === 1) {
            addLog({ type: 'system', content: '── 第二轮：强制选择 ──' })
          }
        }
        break
      }
      case 'concept-attributes': {
        store.setConceptAttributes(data as Record<string, { priceLevel: number; noveltyLevel: number; switchCost: number; socialValidation: number; riskLevel: number }>)
        addLog({ type: 'system', content: '方案属性分析完成' })
        break
      }
      case 'persona-metrics': {
        const segmentId = data.segmentId as string
        store.setPersonaMetrics(segmentId, data.metrics as Record<string, { priceSensitivity: number; noveltyReceptivity: number; switchInertia: number; socialProofNeed: number; riskTolerance: number }>)
        break
      }
      case 'personas': {
        const segmentId = data.segmentId as string
        const agents = data.agents as ABTestPersona[]
        store.addPersonas(segmentId, agents)
        const seg = segments.find(s => s.id === segmentId)
        addLog({
          type: 'persona',
          content: `「${seg?.name || ''}」画像生成完毕：${agents.length} 人`,
          detail: agents.map(a => `${a.name}（${a.personality}）`).join('、'),
        })
        break
      }
      case 'evaluation': {
        const result = data as unknown as EvaluationResult
        store.addResult(result)
        const concept = concepts.find(c => c.id === result.conceptId)
        const attitudeMap: Record<string, string> = { strong_yes: '立刻想用', yes: '值得一试', neutral: '观望', no: '不适合', strong_no: '完全不考虑' }
        addLog({
          type: 'evaluation',
          content: `${result.personaName} 评价「${concept?.name || ''}」→ ${attitudeMap[result.attitude] || result.attitude}`,
          detail: result.firstImpression,
        })
        break
      }
      case 'aggregate': {
        store.addAggregate(data as { segmentId: string; conceptId: string; mean: { overallAcceptance: number; priceAcceptance: number; usabilityFit: number; emotionalAppeal: number; switchLikelihood: number; predictedNPS: number }; adoptionRate: number; npsScore: number; segmentFit: number })
        break
      }
      case 'forced-choice': {
        const choice = data as unknown as ForcedChoiceResult
        store.addForcedChoice(choice)
        const chosen = concepts.find(c => c.id === choice.chosenConceptId)
        addLog({
          type: 'choice',
          content: `${choice.personaName} 选择了「${chosen?.name || ''}」`,
          detail: choice.reasoning,
        })
        break
      }
      case 'done': {
        store.setStatus('completed')
        store.setProgress(null)
        setIsDone(true)
        addLog({ type: 'system', content: '评估完成！' })
        break
      }
      case 'error': {
        setError(data.message as string)
        addLog({ type: 'system', content: `错误: ${data.message}` })
        break
      }
    }
  }

  const progress = store.progress

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">评估进行中</h1>
          {progress && (
            <p className="text-xs text-muted-foreground mt-1">
              {progress.phase === 'attributes' && '分析方案属性...'}
              {progress.phase === 'personas' && `生成画像：${progress.segmentName} (${progress.current + 1}/${progress.total})`}
              {progress.phase === 'eval' && `评估：${progress.segmentName} × ${progress.conceptName} (${progress.current}/${progress.total})`}
              {progress.phase === 'choice' && `强制选择 (${progress.current}/${progress.total})`}
            </p>
          )}
          {progress && (
            <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          )}
        </div>

        {/* Live log */}
        <div className="rounded-lg bg-muted/30 border border-border/50 p-4 max-h-[60vh] overflow-y-auto space-y-1.5">
          {logs.map((log) => (
            <div key={log.id} className="text-xs leading-relaxed">
              {log.type === 'system' && (
                <p className="text-muted-foreground">{log.content}</p>
              )}
              {log.type === 'persona' && (
                <div>
                  <p className="text-foreground">{log.content}</p>
                  {log.detail && <p className="text-muted-foreground ml-3 mt-0.5">{log.detail}</p>}
                </div>
              )}
              {log.type === 'evaluation' && (
                <div className="flex gap-2 items-start">
                  <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">评价</Badge>
                  <div>
                    <p className="text-foreground">{log.content}</p>
                    {log.detail && <p className="text-muted-foreground mt-0.5">"{log.detail}"</p>}
                  </div>
                </div>
              )}
              {log.type === 'choice' && (
                <div className="flex gap-2 items-start">
                  <Badge variant="default" className="text-[9px] shrink-0 mt-0.5">选择</Badge>
                  <div>
                    <p className="text-foreground">{log.content}</p>
                    {log.detail && <p className="text-muted-foreground mt-0.5">"{log.detail}"</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-[11px] text-destructive font-mono">{error}</p>
          </div>
        )}

        {isDone && (
          <Button className="w-full" size="lg" onClick={() => router.push('/abtest')}>
            查看结果
          </Button>
        )}
      </div>
    </div>
  )
}
