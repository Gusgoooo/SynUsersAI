'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import LetterGlitch from '@/components/LetterGlitch'
import { useSimulationStore } from '@/lib/simulation-store'
import { ABTestForm } from '@/components/abtest-form'
import { useLocaleStore } from '@/lib/locale-store'

const RANDOM_CROWDS = {
  zh: [
    '25-35岁互联网产品经理，关注效率工具和AI',
    '大学生群体，对新技术充满好奇但预算有限',
    '35-50岁企业高管，关注ROI和团队管理',
    '自由职业者和独立开发者，依赖订阅制工具',
    '教育工作者，关注AI对教学的影响',
  ],
  en: [
    '25-35 year-old SaaS product managers in the US, focused on productivity and AI tools',
    'Budget-conscious college students who are curious about new technology',
    'Mid-market executives who care about ROI, team adoption, and operational risk',
    'Freelancers and indie developers who rely heavily on subscription software',
    'Teachers and instructional designers evaluating AI in education',
  ],
}

const RANDOM_TOPICS = {
  zh: [
    'AI工具集体涨价50%，用户该不该买单？',
    '远程办公是否正在摧毁团队创造力？',
    'AI生成的内容是否必须强制标注？',
    '初级程序员会在3年内被大模型取代吗？',
    '算法推荐应不应该给用户完全的关闭权？',
    '开源大模型最终能赢过闭源吗？',
  ],
  en: [
    'Should users accept a 50% price increase for AI productivity tools?',
    'Is remote work quietly eroding team creativity?',
    'Should AI-generated content always be labeled?',
    'Will junior developers be replaced by large language models within three years?',
    'Should users have a complete off switch for recommendation algorithms?',
    'Can open-source AI models ultimately beat closed-source models?',
  ],
}

const HOME_COPY = {
  zh: {
    defaultTopic: 'AI工具集体涨价50%，用户该不该买单？',
    modes: {
      roundtable: '圆桌讨论',
      abtest: 'A/B测试',
      interview: '用户访谈',
    },
    comingSoon: '敬请期待',
    audience: '人群描述',
    random: '随机',
    importAudience: '导入人群数据',
    importHint: '支持 CSV、Excel、Word、TXT；会把来源材料蒸馏成记忆、消费习惯和语言风格',
    selectedFiles: '已选择',
    clearFiles: '清除',
    audiencePlaceholder: '描述目标用户群体的特征，例如：25-35岁的互联网产品经理，关注AI工具效率...',
    topic: '讨论话题',
    topicPlaceholder: '输入讨论话题...',
    duration: '对话时长',
    minutes: '分钟',
    agents: '虚拟用户数量',
    people: '人',
    model: 'AI 模型',
    generating: '生成中...',
    generate: '生成虚拟用户',
    generateFromData: '基于来源数据生成人设',
    loadingUsers: (count: string) => `正在生成 ${count} 个虚拟用户...`,
    loadingFromData: (count: string) => `正在从来源数据生成 ${count} 个记忆化人设...`,
    buildPrompt: '→ 构建 prompt...',
    parseFiles: '→ 解析来源文件并切分记忆素材...',
    synthesizeEvidence: '→ 蒸馏消费习惯、认知方式和语言风格...',
    callLlm: '→ 调用 LLM 生成角色（预计 20-40s）...',
    parseResult: '→ 解析结果...',
    slow: '⚠ 耗时较长，请继续等待或检查网络',
    invalidAgents: '未返回有效角色数据',
  },
  en: {
    defaultTopic: 'Should users accept a 50% price increase for AI productivity tools?',
    modes: {
      roundtable: 'Roundtable',
      abtest: 'A/B Test',
      interview: 'Interview',
    },
    comingSoon: 'Coming soon',
    audience: 'Audience',
    random: 'Random',
    importAudience: 'Import audience',
    importHint: 'Supports CSV, Excel, Word, and TXT. Source material is distilled into memory, consumption habits, and language style.',
    selectedFiles: 'Selected',
    clearFiles: 'Clear',
    audiencePlaceholder: 'Describe the target audience, e.g. US SaaS product managers aged 25-35 who care about AI productivity tools...',
    topic: 'Discussion topic',
    topicPlaceholder: 'Enter a topic...',
    duration: 'Duration',
    minutes: 'min',
    agents: 'Virtual users',
    people: 'users',
    model: 'AI model',
    generating: 'Generating...',
    generate: 'Generate virtual users',
    generateFromData: 'Generate personas from source data',
    loadingUsers: (count: string) => `Generating ${count} virtual users...`,
    loadingFromData: (count: string) => `Generating ${count} memory-grounded personas from source data...`,
    buildPrompt: '→ Building prompt...',
    parseFiles: '→ Parsing source files into memory material...',
    synthesizeEvidence: '→ Distilling habits, cognitive style, and language register...',
    callLlm: '→ Calling LLM to generate personas (about 20-40s)...',
    parseResult: '→ Parsing result...',
    slow: '⚠ Taking longer than usual. Keep waiting or check the network.',
    invalidAgents: 'No valid persona data returned',
  },
}

const ALL_DEFAULT_TOPICS = [...RANDOM_TOPICS.zh, ...RANDOM_TOPICS.en]

export default function ConfigPage() {
  const router = useRouter()
  const { setConfig, setAgents, setStatus, reset } = useSimulationStore()
  const locale = useLocaleStore((s) => s.locale)
  const copy = HOME_COPY[locale]
  const [crowdDescription, setCrowdDescription] = useState('')
  const [topic, setTopic] = useState(HOME_COPY.zh.defaultTopic)
  const [duration, setDuration] = useState(10)
  const [agentCount, setAgentCount] = useState('4')
  const [model, setModel] = useState('gpt-5.4')
  const [activeMode, setActiveMode] = useState<'roundtable' | 'interview' | 'abtest'>('roundtable')
  const [loading, setLoading] = useState(false)
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [genError, setGenError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isImportMode = importFiles.length > 0

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  useEffect(() => {
    setTopic((prev) => (!prev.trim() || ALL_DEFAULT_TOPICS.includes(prev)) ? copy.defaultTopic : prev)
  }, [copy.defaultTopic])

  function randomizeCrowd() {
    const options = RANDOM_CROWDS[locale]
    const pick = options[Math.floor(Math.random() * options.length)]
    setCrowdDescription(pick)
  }

  function randomizeTopic() {
    const options = RANDOM_TOPICS[locale]
    const pick = options[Math.floor(Math.random() * options.length)]
    setTopic(pick)
  }

  function handleFilesSelected(files: FileList | null) {
    setGenError('')
    setImportFiles(files ? Array.from(files) : [])
  }

  async function handleImportGenerate() {
    if (importFiles.length === 0) return

    reset()
    setGenError('')
    setConfig({ topic, mode: 'imported', duration, model, locale })
    setStatus('generating')
    setLoading(true)

    try {
      const form = new FormData()
      form.set('topic', topic)
      form.set('agentCount', agentCount)
      form.set('model', model)
      form.set('language', locale)
      importFiles.forEach((file) => form.append('files', file))

      const res = await fetch('/api/import-population', {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`API ${res.status}: ${errText}`)
      }

      const data = await res.json()
      if (data.agents?.length > 0) {
        setAgents(data.agents)
        setStatus('previewing')
        router.push('/personas')
      } else {
        throw new Error(copy.invalidAgents)
      }
    } catch (err) {
      console.error(err)
      setGenError(String(err))
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (isImportMode) {
      await handleImportGenerate()
      return
    }

    reset()
    setGenError('')
    setConfig({ topic, mode: 'generated', duration, model, locale })
    setStatus('generating')
    setLoading(true)

    try {
      const res = await fetch('/api/generate-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          crowdDescription,
          agentCount: Number(agentCount),
          model,
          language: locale,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`API ${res.status}: ${errText}`)
      }

      const data = await res.json()
      if (data.agents?.length > 0) {
        setAgents(data.agents)
        setStatus('previewing')
        router.push('/personas')
      } else {
        throw new Error(copy.invalidAgents)
      }
    } catch (err) {
      console.error(err)
      setGenError(String(err))
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <div className="absolute inset-0 z-0">
        <LetterGlitch
          glitchSpeed={50}
          centerVignette={true}
          outerVignette={false}
          smooth
          glitchColors={['#212221', '#262627', '#1a1a1b']}
        />
      </div>
      <div className="relative z-10 w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight font-serif text-foreground">SynUsers.AI</h1>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex rounded-xl border bg-card/80 backdrop-blur-sm p-1 gap-0.5">
            {([
              { key: 'roundtable', label: copy.modes.roundtable, disabled: false },
              { key: 'abtest', label: copy.modes.abtest, disabled: false },
              { key: 'interview', label: copy.modes.interview, disabled: true },
            ] as const).map(({ key, label, disabled }) => (
              <button
                key={key}
                type="button"
                onClick={() => !disabled && setActiveMode(key)}
                disabled={disabled}
                title={disabled ? copy.comingSoon : undefined}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  disabled
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : activeMode === key
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      {activeMode === 'abtest' ? (
        <Card className="w-full backdrop-blur-sm bg-card/90">
          <CardContent className="pt-6">
            <ABTestForm />
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full backdrop-blur-sm bg-card/90">
          <CardContent className="pt-6 space-y-6">

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{copy.audience}</Label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={randomizeCrowd} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {copy.random}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.docx,.txt,.md"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {copy.importAudience}
                  </Button>
                </div>
              </div>
              <Textarea
                value={crowdDescription}
                onChange={(e) => setCrowdDescription(e.target.value)}
                placeholder={copy.audiencePlaceholder}
                rows={3}
              />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">{copy.importHint}</p>
                {importFiles.length > 0 && (
                  <div className="rounded-md border bg-background/60 px-3 py-2 text-[11px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {copy.selectedFiles}: {importFiles.map((file) => file.name).join(', ')}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setImportFiles([])
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                      >
                        {copy.clearFiles}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{copy.topic}</Label>
                <button type="button" onClick={randomizeTopic} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {copy.random}
                </button>
              </div>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={copy.topicPlaceholder}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{copy.duration}</Label>
                <Select value={`${duration}`} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 {copy.minutes}</SelectItem>
                    <SelectItem value="10">10 {copy.minutes}</SelectItem>
                    <SelectItem value="20">20 {copy.minutes}</SelectItem>
                    <SelectItem value="30">30 {copy.minutes}</SelectItem>
                    <SelectItem value="60">60 {copy.minutes}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{copy.agents}</Label>
                <Select value={agentCount} onValueChange={(v) => v && setAgentCount(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} {copy.people}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{copy.model}</Label>
                <Select value={model} onValueChange={(v) => v && setModel(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5.4">GPT-5.4</SelectItem>
                    <SelectItem value="gemini">Gemini 3 Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleGenerate} disabled={loading || !topic.trim()}>
              {loading ? copy.generating : isImportMode ? copy.generateFromData : copy.generate}
            </Button>

            {loading && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{isImportMode ? copy.loadingFromData(agentCount) : copy.loadingUsers(agentCount)}</span>
                    <span className="font-mono">{elapsed}s</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/60 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(95, (elapsed / 40) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1 text-[10px] font-mono text-muted-foreground">
                  <p className={elapsed >= 0 ? 'text-foreground/70' : ''}>
                    {isImportMode ? copy.parseFiles : copy.buildPrompt}{elapsed >= 2 ? ' ✓' : ''}
                  </p>
                  {elapsed >= 2 && (
                    <p className={elapsed >= 2 ? 'text-foreground/70' : ''}>
                      {isImportMode ? copy.synthesizeEvidence : copy.callLlm}{elapsed >= 35 ? ' ✓' : ''}
                    </p>
                  )}
                  {elapsed >= 35 && (
                    <p className="text-foreground/70">{copy.parseResult}</p>
                  )}
                  {elapsed >= 60 && (
                    <p className="text-yellow-500">{copy.slow}</p>
                  )}
                </div>
              </div>
            )}

            {genError && !loading && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-[11px] text-destructive font-mono">{genError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}
