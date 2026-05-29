'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const iconRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (show && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      const tooltipWidth = 240
      let left = rect.left + rect.width / 2 - tooltipWidth / 2
      if (left < 8) left = 8
      if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8
      setPos({ top: rect.top - 8, left })
    }
  }, [show])

  return (
    <>
      <span
        ref={iconRef}
        className="inline-flex items-center ml-1.5 cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      </span>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] px-3 py-2 text-[11px] leading-relaxed text-popover-foreground bg-popover border rounded-md shadow-md w-60 pointer-events-none animate-in fade-in-0 duration-150"
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  )
}
