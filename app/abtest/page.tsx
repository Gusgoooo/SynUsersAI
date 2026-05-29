'use client'

import { useRouter } from 'next/navigation'
import { useABTestStore } from '@/lib/abtest-store'
import { ABTestResults } from '@/components/abtest-results'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export default function ABTestResultsPage() {
  const router = useRouter()
  const status = useABTestStore((s) => s.status)
  const results = useABTestStore((s) => s.results)

  if (status !== 'completed' || results.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">没有测试结果</p>
          <Button onClick={() => router.push('/')}>返回首页</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">A/B 测试结果</h1>
          <Button variant="outline" onClick={() => router.push('/')}>
            新测试
          </Button>
        </div>
        <ABTestResults />
      </div>
    </div>
  )
}
