'use client'

import { useRef, useEffect, useState } from 'react'
import { useSimulationStore } from '@/lib/simulation-store'
import { PersonaCard } from '@/components/persona-card'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// Must match AGENT_COLORS in dynamics-panel.tsx (hex) for consistent mapping
export const AGENT_COLOR_HEX = [
  '#f97316', '#3b82f6', '#22c55e', '#a855f7',
  '#ec4899', '#14b8a6', '#eab308', '#6366f1',
  '#f43f5e', '#06b6d4', '#84cc16', '#d946ef',
]

function getInitial(name: string): string {
  if (name === '主持人') return '主'
  if (name === 'You') return 'U'
  return name.charAt(0).toUpperCase()
}

const MODERATOR_COLOR = '#6b7280'

export function SimulationThread() {
  const messages = useSimulationStore((s) => s.messages)
  const agents = useSimulationStore((s) => s.agents)
  const addMessage = useSimulationStore((s) => s.addMessage)
  const status = useSimulationStore((s) => s.status)
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
            <p className="text-sm text-muted-foreground">等待对话开始...</p>
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
              </div>
            </div>
          )
        ))}
        {status === 'running' && messages.length > 0 && (
          <div className="flex gap-2 items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
              <span className="animate-pulse">...</span>
            </div>
            <span className="text-xs text-muted-foreground">思考中</span>
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
            placeholder="输入观点介入对话..."
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            onClick={handleSend}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            发送
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
