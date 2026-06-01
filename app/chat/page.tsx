'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSimulationStore, type SimAgent } from '@/lib/simulation-store'
import { SimulationThread } from '@/components/simulation-thread'
import { DynamicsPanel } from '@/components/dynamics-panel'
import { Button } from '@/components/ui/button'
import { useLocaleStore } from '@/lib/locale-store'
import { useBYOKStore } from '@/lib/byok-store'

const COPY = {
  zh: {
    exit: '← 退出',
    running: (round: number) => `进行中 · 第 ${round} 轮`,
    completed: '已完成',
    waiting: '等待开始',
    stop: '停止',
    report: '生成报告',
    viewReport: '查看报告 →',
    connecting: '正在连接模拟引擎',
    connectingDetail: '后端会逐步返回大模型正在执行的任务。',
  },
  en: {
    exit: '← Exit',
    running: (round: number) => `Running · Round ${round}`,
    completed: 'Completed',
    waiting: 'Waiting to start',
    stop: 'Stop',
    report: 'Generate report',
    viewReport: 'View report →',
    connecting: 'Connecting to the simulation engine',
    connectingDetail: 'The backend will stream what the model is doing step by step.',
  },
}

export default function ChatPage() {
  const router = useRouter()
  const { config, status, agents, messages, progress, setStatus, setProgress, addMessage, startStreamMessage, appendStreamChunk, finalizeStreamMessage, updateAgent, addImpulseScores, addConvergenceSnapshot, addCognitiveEvent, setReport } =
    useSimulationStore()
  const locale = useLocaleStore((s) => s.locale)
  const getLLMConfig = useBYOKStore((s) => s.getRequestConfig)
  const copy = COPY[locale]
  const abortRef = useRef<AbortController | null>(null)
  const [roundCount, setRoundCount] = useState(0)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const dragging = useRef(false)

  const handleMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const newWidth = window.innerWidth - e.clientX - 16
      setSidebarWidth(Math.max(240, Math.min(600, newWidth)))
    }
    function handleMouseUp() {
      if (dragging.current) {
        dragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (agents.length === 0) return

    const abortController = new AbortController()
    abortRef.current = abortController
    setStatus('running')
    setProgress({
      step: 'connect',
      label: copy.connecting,
      detail: copy.connectingDetail,
    })

    async function runSimulation() {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: config.topic,
          topicContext: config.topicContext,
          mode: config.mode,
          duration: config.duration,
          model: config.model || 'gpt-5.4',
          language: config.locale || locale,
          llmConfig: getLLMConfig(),
          personas: agents,
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('Simulate API error:', res.status, errText)
        setStatus('completed')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7)
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6))
              handleSSEEvent(currentEvent, data)
            } catch (e) {
              console.warn('SSE parse error:', e, line)
            }
            currentEvent = ''
          }
        }
      }
    }

    function handleSSEEvent(event: string, data: Record<string, unknown>) {
      switch (event) {
        case 'progress':
          setProgress({
            step: String(data.step || 'progress'),
            label: String(data.label || copy.connecting),
            detail: data.detail ? String(data.detail) : undefined,
          })
          break
        case 'stream-start':
          startStreamMessage(
            data.id as string,
            data.speakerId as string,
            data.speakerName as string,
            data.evidence as never[] | undefined,
            data.usedEvidenceIds as string[] | undefined,
            data.activatedMemories as never[] | undefined
          )
          break
        case 'stream-chunk':
          appendStreamChunk(data.id as string, data.chunk as string)
          break
        case 'stream-end':
          finalizeStreamMessage(
            data.id as string,
            data.text as string,
            data.evidence as never[] | undefined,
            data.usedEvidenceIds as string[] | undefined,
            data.activatedMemories as never[] | undefined
          )
          if (data.speakerId !== 'system') {
            setRoundCount((c) => c + 1)
          }
          break
        case 'utterance':
          addMessage(data as never)
          if (data.speakerId !== 'system') {
            setRoundCount((c) => c + 1)
          }
          break
        case 'state-update':
          for (const agent of data.agents as Array<Partial<SimAgent> & { id: string }>) {
            updateAgent(agent.id, agent)
          }
          break
        case 'impulse-scores':
          addImpulseScores(data.scores as never[])
          break
        case 'convergence':
          addConvergenceSnapshot(data as never)
          break
        case 'cognitive-event':
          addCognitiveEvent(data as never)
          break
        case 'report':
          setReport(data.markdown as string)
          break
        case 'error':
          console.error('Simulation error:', data.message)
          setProgress(null)
          setStatus('completed')
          break
        case 'done':
          setProgress(null)
          setStatus('completed')
          break
      }
    }

    runSimulation().catch((err) => {
      if (err.name !== 'AbortError') console.error(err)
    })

    return () => {
      abortController.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length])

  function handleStop() {
    abortRef.current?.abort()
    setProgress(null)
    setStatus('completed')
  }

  function handleGenerateReport() {
    abortRef.current?.abort()
    setProgress(null)
    setStatus('completed')
    router.push('/report')
  }

  function handleExit() {
    abortRef.current?.abort()
    setProgress(null)
    router.push('/')
  }

  useEffect(() => {
    if (status === 'completed' && useSimulationStore.getState().report) {
      const timer = setTimeout(() => router.push('/report'), 3000)
      return () => clearTimeout(timer)
    }
  }, [status, router])

  return (
    <div className="flex flex-col h-screen p-4 gap-4">
      <header className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            {copy.exit}
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-semibold text-sm">{config.topic}</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {status === 'running'
                ? progress?.label
                  ? `${copy.running(roundCount)} · ${progress.label}`
                  : copy.running(roundCount)
                : status === 'completed'
                  ? copy.completed
                  : copy.waiting}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <>
              <Button variant="outline" size="sm" onClick={handleStop}>
                {copy.stop}
              </Button>
              <Button size="sm" onClick={handleGenerateReport}>
                {copy.report}
              </Button>
            </>
          )}
          {status === 'completed' && (
            <Button size="sm" onClick={() => router.push('/report')}>
              {copy.viewReport}
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 gap-0 min-h-0">
        <main className="flex-1 rounded-xl border bg-card overflow-hidden">
          <SimulationThread />
        </main>
        <div
          onMouseDown={handleMouseDown}
          className="w-2 cursor-col-resize flex items-center justify-center hover:bg-border/50 active:bg-border transition-colors rounded mx-1"
        >
          <div className="w-0.5 h-8 bg-border rounded-full" />
        </div>
        <aside style={{ width: sidebarWidth }} className="shrink-0 rounded-xl border bg-card overflow-hidden">
          <DynamicsPanel />
        </aside>
      </div>
    </div>
  )
}
