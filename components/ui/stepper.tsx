'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface StepperContextValue {
  currentStep: number
  totalSteps: number
}

const StepperContext = React.createContext<StepperContextValue>({ currentStep: 0, totalSteps: 0 })

interface StepperProps {
  currentStep: number
  children: React.ReactNode
  className?: string
}

export function Stepper({ currentStep, children, className }: StepperProps) {
  const steps = React.Children.toArray(children).filter(Boolean)
  return (
    <StepperContext.Provider value={{ currentStep, totalSteps: steps.length }}>
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <React.Fragment key={i}>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  i < currentStep && 'bg-primary text-primary-foreground',
                  i === currentStep && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
                  i > currentStep && 'bg-muted text-muted-foreground',
                )}
              >
                {i < currentStep ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'h-px flex-1 transition-colors',
                  i < currentStep ? 'bg-primary' : 'bg-border',
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
        {steps[currentStep]}
      </div>
    </StepperContext.Provider>
  )
}

interface StepProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Step({ title, action, children, className }: StepProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}
