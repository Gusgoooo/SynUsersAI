'use client'

import { useRef, useEffect, useState } from 'react'
import { useSimulationStore } from '@/lib/simulation-store'
import { PersonaCard } from '@/components/persona-card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useLocaleStore } from '@/lib/locale-store'
import { Brain } from 'lucide-react'

// Must match AGENT_COLORS in dynamics-panel.tsx (hex) for consistent mapping
export const AGENT_COLOR_HEX = [
  '#f97316', '#3b82f6', '#22c55e', '#a855f7',
  '#ec4899', '#14b8a6', '#eab308', '#6366f1',
  '#f43f5e', '#06b6d4', '#84cc16', '#d946ef',
]

function getInitial(name: string): string {
  if (name === '主持人') return '主'
  if (name === 'Moderator') return 'M'
  if (name === 'You') return 'U'
  return name.charAt(0).toUpperCase()
}

const MODERATOR_COLOR = '#6b7280'

const COPY = {
  zh: {
    waiting: '等待对话开始...',
    thinking: '思考中',
    placeholder: '输入观点介入对话...',
    send: '发送',
    memory: '为什么会这样想',
    whyTitle: '记忆如何影响这句话',
    sourceAnchors: '来源锚点',
    reason: '影响',
    intensity: '强度',
  },
  en: {
    waiting: 'Waiting for the conversation to start...',
    thinking: 'Thinking',
    placeholder: 'Add a human intervention...',
    send: 'Send',
    memory: 'Why they think this',
    whyTitle: 'How memory shaped this message',
    sourceAnchors: 'Source anchors',
    reason: 'Influence',
    intensity: 'Intensity',
  },
}

export function SimulationThread() {
  const messages = useSimulationStore((s) => s.messages)
  const agents = useSimulationStore((s) => s.agents)
  const addMessage = useSimulationStore((s) => s.addMessage)
  const status = useSimulationStore((s) => s.status)
  const locale = useLocaleStore((s) => s.locale)
  const copy = COPY[locale]
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  function getAgentColor(speakerId: string): string {
    if (speakerId === 'system') return MODERATOR_COLOR
    const idx = agents.findIndex(a => a.id === speakerId)
    return idx >= 0 ? AGENT_COLOR_HEX[idx % AGENT_COLOR_HEX.length] : MODERATOR_COLOR
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  function handleSend() {
    if (!input.trim()) return
    addMessage({
      id: crypto.randomUUID(),
      speakerId: 'user',
      speakerName: 'You',
      text: input.trim(),
      inner_thoughts: '',
      timestamp: Date.now(),
    })
    setInput('')
  }

  function handleAvatarClick(speakerId: string) {
    if (speakerId === 'user' || speakerId === 'system') return
    setSelectedAgentId(speakerId)
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">{copy.waiting}</p>
          </div>
        )}
        {messages.map((msg) => (
          msg.speakerId === 'user' ? (
            <div key={msg.id} className="flex justify-end gap-2">
              <div className="max-w-[75%] rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                {msg.text}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/80 text-xs font-medium text-primary-foreground">
                U
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAvatarClick(msg.speakerId)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${msg.speakerId !== 'system' ? 'cursor-pointer hover:ring-2 hover:ring-foreground/20 transition-shadow' : ''}`}
                style={{ backgroundColor: getAgentColor(msg.speakerId) }}
                title={msg.speakerName}
              >
                {getInitial(msg.speakerName)}
              </button>
              <div className="max-w-[75%]">
                <span className="text-[10px] text-muted-foreground mb-0.5 block">{msg.speakerName}</span>
                <div className="rounded-lg bg-secondary px-4 py-2.5 text-sm">
                  {msg.text}
                </div>
                {msg.activatedMemories && msg.activatedMemories.length > 0 && (
                  <Dialog>
                    <DialogTrigger className="mt-1.5 inline-flex h-6 items-center gap-1.5 rounded-md border bg-background px-2 text-[10px] text-muted-foreground hover:text-foreground">
                      <Brain className="h-3 w-3" />
                      {copy.memory}
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-base">{copy.whyTitle}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed">
                          {msg.text}
                        </div>
                        {msg.activatedMemories.map((memory, index) => (
                          <div key={`${memory.label}-${index}`} className="rounded-md border p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium">{memory.label}</span>
                              <span className="text-[10px] text-muted-foreground">{copy.intensity}: {memory.intensity}</span>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {copy.reason}: {memory.influence}
                            </p>
                          </div>
                        ))}
                        {msg.evidence && msg.evidence.length > 0 && (
                          <div className="border-t pt-3 space-y-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{copy.sourceAnchors}</p>
                            {msg.evidence.map((item) => (
                              <div key={item.evidenceId} className="rounded-md bg-muted/40 p-2">
                                <p className="text-[10px] leading-relaxed text-muted-foreground">"{item.quote}"</p>
                                <p className="mt-1 text-[9px] text-muted-foreground">
                                  {item.sourceName} · {item.locator}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          )
        ))}
        {status === 'running' && messages.length > 0 && (
          <div className="flex gap-2 items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
              <span className="animate-pulse">...</span>
            </div>
            <span className="text-xs text-muted-foreground">{copy.thinking}</span>
          </div>
        )}
      </div>
      <div className="border-t px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={copy.placeholder}
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            onClick={handleSend}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {copy.send}
          </button>
        </div>
      </div>

      <Dialog open={!!selectedAgent} onOpenChange={(open) => { if (!open) setSelectedAgentId(null) }}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto p-0">
          {selectedAgent && <PersonaCard agent={selectedAgent} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
