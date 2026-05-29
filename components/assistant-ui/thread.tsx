'use client'

import { useRef, useEffect } from 'react'
import {
  ThreadPrimitive,
  ComposerPrimitive,
} from '@assistant-ui/react'
import { useSimulationStore } from '@/lib/simulation-store'

const AVATAR_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
  'bg-pink-500', 'bg-teal-500', 'bg-yellow-500', 'bg-indigo-500',
  'bg-red-500', 'bg-cyan-500',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitial(name: string): string {
  if (name === 'Moderator') return 'M'
  if (name === 'You') return 'U'
  return name.charAt(0).toUpperCase()
}

export function Thread() {
  const messages = useSimulationStore((s) => s.messages)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages.length])

  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getAvatarColor(msg.speakerName)} text-xs font-medium text-white`} title={msg.speakerName}>
                {getInitial(msg.speakerName)}
              </div>
              <div className="max-w-[75%]">
                <span className="text-[10px] text-muted-foreground mb-0.5 block">{msg.speakerName}</span>
                <div className="rounded-lg bg-secondary px-4 py-2.5 text-sm">
                  {msg.text}
                </div>
                {msg.inner_thoughts && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1 italic">
                    💭 {msg.inner_thoughts}
                  </p>
                )}
              </div>
            </div>
          )
        ))}
      </div>
      <div className="border-t px-4 py-3">
        <ComposerPrimitive.Root className="flex gap-2">
          <ComposerPrimitive.Input
            placeholder="输入人为干预（Human Perturbation）..."
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <ComposerPrimitive.Send className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            发送
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  )
}
