'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import LetterGlitch from '@/components/LetterGlitch'
import { useSimulationStore } from '@/lib/simulation-store'
import { ABTestForm } from '@/components/abtest-form'
import { useLocaleStore } from '@/lib/locale-store'
import { useBYOKStore } from '@/lib/byok-store'
import { detectProviderName, modelProviderFromProtocol, type LLMProtocol } from '@/lib/llm/provider-config'
import { getGenerationFlowSteps, type FlowProgressEvent, type GenerationFlowKind } from '@/lib/flow-progress'
import { getModelInterruptedMessage, getRawErrorMessage, isAbortLikeError } from '@/lib/error-message'
import { ROUNDTABLE_DURATION_PRESETS, getRoundtableDurationPreset, type RoundtableDurationTier } from '@/lib/roundtable-duration'
import type { SimAgent } from '@/lib/simulation-store'

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
    '年轻人越来越依赖短视频学习，深度阅读会被削弱吗？',
    'AI工具集体涨价50%，用户该不该买单？',
    '远程办公是否正在摧毁团队创造力？',
    'AI生成的内容是否必须强制标注？',
    '初级程序员会在3年内被大模型取代吗？',
    '算法推荐应不应该给用户完全的关闭权？',
    '开源大模型最终能赢过闭源吗？',
    'AI客服默认接管售前咨询，会提升效率还是伤害信任？',
    '企业内部知识库接入大模型后，员工还会认真沉淀文档吗？',
    'AI会议纪要自动分发给所有人，是协作提升还是隐私冒犯？',
    '公司要求所有人使用统一AI工具，个人习惯应该让位吗？',
    'AI写作工具越来越像同质化模板，用户还愿意长期订阅吗？',
    'AI产品免费试用结束后，什么情况下用户才会真正付费？',
    'AI功能被塞进所有软件里，用户是真的需要还是被迫接受？',
    '企业采购AI工具时，安全合规和效率提升哪个更能打动决策者？',
    'AI生成PPT是否会降低团队的真实思考质量？',
    'AI陪伴产品到底是在缓解孤独，还是制造新的依赖？',
    '智能硬件加入AI助手后，用户会觉得更有价值还是更烦？',
    'AI搜索如果不展示来源，用户还会相信答案吗？',
    'AI推荐的健康建议，普通用户应该相信到什么程度？',
    'AI学习助手会让学生更会学习，还是更会偷懒？',
    '学校是否应该允许学生用AI完成作业初稿？',
    '知识付费课程如果大量使用AI生成内容，用户能接受吗？',
    '在线教育平台涨价后，家长还会继续付费吗？',
    '大学生为效率工具付费，是刚需还是焦虑消费？',
    '职场新人使用AI完成工作，会被认为高效还是能力不足？',
    '公司是否应该公开员工使用AI工具的记录？',
    '四天工作制真的能提升效率，还是只是福利包装？',
    '远程办公员工是否应该接受更强的在线监控？',
    '灵活用工平台抽成越来越高，劳动者是否还有选择？',
    '年轻人不愿意当管理者，是逃避责任还是理性选择？',
    '副业越来越普遍，公司该不该限制员工做副业？',
    '订阅制软件越来越多，用户是否正在产生订阅疲劳？',
    '会员权益越来越复杂，用户还相信会员体系吗？',
    '低价平替品牌崛起后，高端品牌还靠什么说服用户？',
    '即时零售越来越快，用户愿不愿意为30分钟送达多付钱？',
    '外卖平台提高配送费后，用户会减少下单吗？',
    '预制菜进入连锁餐饮，消费者是否有知情权？',
    '新能源车取消补贴后，用户购买意愿会受到多大影响？',
    '车企把核心功能做成订阅，用户能接受吗？',
    '智能家居设备越来越多，普通家庭真的愿意持续维护吗？',
    '二手平台越来越专业化，普通用户还愿意自己卖闲置吗？',
    '社区团购低价结束后，用户还会留下来吗？',
    '品牌联名越来越频繁，消费者是兴奋还是麻木？',
    '直播带货退货率高，是冲动消费还是信任问题？',
    '小红书种草越来越商业化，用户还相信真实推荐吗？',
    '短视频平台应不应该强制标注广告和软广？',
    '创作者使用AI批量产出内容，会破坏平台生态吗？',
    '普通人还愿意为没有广告的内容平台付费吗？',
    '社交媒体隐藏点赞数，能不能减轻用户焦虑？',
    '陌生人社交产品如何让用户相信安全性？',
    '职场社交平台越来越像朋友圈，用户会不会反感？',
    '隐私政策太长没人看，平台是否应该承担更多解释责任？',
    '个性化广告如果更精准，用户会觉得方便还是被监视？',
    '儿童智能手表功能越来越多，家长是在保护还是过度控制？',
    '老人使用智能设备时，产品应该追求功能多还是极简？',
    '社区养老服务数字化，老人和家属谁才是真正用户？',
    '家庭记账App为什么很难长期留住用户？',
    '年轻人愿意为心理健康App持续付费吗？',
    '运动打卡产品的社交排名，是激励还是压力？',
    '睡眠监测数据越来越多，用户真的会因此改变习惯吗？',
    '健康食品价格高，消费者愿意为成分透明买单吗？',
    '城市通勤时间越来越长，用户会为附近办公空间付费吗？',
    '共享办公对自由职业者是效率工具还是社交场景？',
    '租房平台如果引入信用评分，租客会觉得公平吗？',
    '社区商业越来越连锁化，本地小店还有竞争力吗？',
    '年轻人不愿意办婚礼，是消费降级还是价值观变化？',
    '宠物消费升级后，用户愿意为宠物保险买单吗？',
    '旅游平台用AI生成行程，用户会相信还是仍想自己查攻略？',
    '本地生活平台的榜单推荐，用户还认为可靠吗？',
    '银行App功能越来越多，用户到底需要金融超市还是简单转账？',
    '保险产品线上化后，用户会更愿意购买还是更不信任？',
    '企业SaaS从免费版转收费，团队迁移成本会不会留下用户？',
    'B端产品做得越来越消费化，企业用户真的在乎体验吗？',
    '低代码平台能不能让业务人员真正自己搭系统？',
    '数据看板越来越多，管理者真的更懂业务了吗？',
    '自动化工具替代重复劳动后，员工会拥抱还是抵触？',
    '开源软件商业化后，社区用户会继续支持吗？',
    '国产软件替代海外工具，用户最担心的是什么？',
    '公司内部推新系统，为什么员工总是抗拒迁移？',
    '产品内置社区，是增强粘性还是增加运营负担？',
    '用户调研如果由AI虚拟用户先跑一轮，团队会信吗？',
  ],
  en: [
    'Should users accept a 50% price increase for AI productivity tools?',
    'Is remote work quietly eroding team creativity?',
    'Should AI-generated content always be labeled?',
    'Will junior developers be replaced by large language models within three years?',
    'Should users have a complete off switch for recommendation algorithms?',
    'Can open-source AI models ultimately beat closed-source models?',
    'Should AI customer support take over pre-sales conversations by default?',
    'Will employees still document knowledge carefully after an internal AI knowledge base launches?',
    'Are AI meeting notes a collaboration upgrade or a privacy problem?',
    'Should companies require everyone to use the same AI tool?',
    'Will users keep paying for AI writing tools if the output starts feeling templated?',
    'What makes users convert after a free trial for an AI product?',
    'Are users asking for AI in every app, or are they being forced into it?',
    'For enterprise AI tools, does security compliance matter more than productivity gains?',
    'Does AI-generated slideware improve communication or weaken team thinking?',
    'Do AI companion products reduce loneliness or create a new dependency?',
    'Do AI assistants make smart devices more valuable or more annoying?',
    'Would users trust AI search answers that do not show sources?',
    'How much should ordinary users trust AI-generated health advice?',
    'Do AI study assistants help students learn better or make it easier to avoid learning?',
    'Should schools allow students to use AI for first drafts of assignments?',
    'Is short-form video learning weakening deep reading habits?',
    'Would users accept paid courses that rely heavily on AI-generated lessons?',
    'If online tutoring platforms raise prices, will parents keep paying?',
    'Are college students paying for productivity tools because they need them or because they feel anxious?',
    'When junior employees use AI at work, does it signal efficiency or weak ability?',
    'Should companies disclose and track employee AI tool usage?',
    'Would a four-day workweek improve productivity or mostly function as benefit branding?',
    'Should remote employees accept stronger online monitoring?',
    'As gig platforms increase take rates, do workers still feel they have a choice?',
    'Why are younger workers less interested in becoming managers?',
    'Should employers restrict employees from running side businesses?',
    'Are users reaching subscription fatigue from too many software subscriptions?',
    'Do users still trust loyalty programs when benefits become complicated?',
    'How can premium brands justify their price when low-cost alternatives get better?',
    'Will users pay extra for 30-minute delivery in instant commerce?',
    'Will higher delivery fees reduce food delivery usage?',
    'Should restaurants disclose when they use pre-made meal components?',
    'How will electric vehicle demand change when subsidies disappear?',
    'Will drivers accept core car features becoming subscriptions?',
    'Do mainstream households really want to maintain a growing smart-home stack?',
    'Will ordinary users still sell used goods themselves as resale platforms professionalize?',
    'Will users stay with community group-buying platforms after low-price subsidies end?',
    'Are brand collaborations still exciting, or are consumers becoming numb to them?',
    'Is high return behavior in livestream shopping about impulse buying or broken trust?',
    'Do users still trust recommendations on creator-driven shopping platforms?',
    'Should short-video platforms force clear labels for ads and sponsored content?',
    'Will AI-assisted mass content production damage creator platforms?',
    'Would ordinary users pay for an ad-free content platform?',
    'Can hiding like counts reduce social-media anxiety?',
    'How can social discovery apps make users feel safe with strangers?',
    'Are professional networking apps becoming too much like personal social feeds?',
    'Should platforms explain privacy policies in a way normal users can actually understand?',
    'Do users see highly personalized ads as useful or creepy?',
    'Are feature-rich kids smartwatches protection or over-control?',
    'For older adults, should smart devices prioritize more features or radical simplicity?',
    'In digital eldercare services, who is the real user: seniors or their adult children?',
    'Why is long-term retention so hard for household budgeting apps?',
    'Will young adults pay continuously for mental-health apps?',
    'Do social rankings in fitness apps motivate people or create pressure?',
    'Does sleep tracking data actually change user behavior?',
    'Will consumers pay more for health foods with transparent ingredients?',
    'Would commuters pay for nearby flexible office spaces to reduce travel time?',
    'Is coworking for freelancers mainly a productivity tool or a social space?',
    'Would renters see credit scoring on rental platforms as fair or discriminatory?',
    'Can local independent shops compete as neighborhood commerce becomes chain-driven?',
    'Are younger people rejecting weddings because of lower budgets or changing values?',
    'Will pet owners pay for pet insurance as pet spending rises?',
    'Would travelers trust AI-generated itineraries or still research everything themselves?',
    'Do users still trust ranking lists on local-services platforms?',
    'Do banking apps need to become financial supermarkets, or should they stay simple?',
    'Does online insurance make users more willing to buy or more distrustful?',
    'When B2B SaaS free plans become paid, will switching costs keep teams from leaving?',
    'Do enterprise users really care about consumer-grade product experience?',
    'Can low-code platforms actually let business teams build their own systems?',
    'Do more dashboards make managers understand the business better?',
    'Will employees embrace automation tools that replace repetitive work, or resist them?',
    'Will open-source communities keep supporting projects after commercialization?',
    'What worries users most when replacing global software with local alternatives?',
    'Why do employees resist migrating to new internal systems?',
    'Does an in-product community increase retention or create an operations burden?',
    'Would product teams trust an AI synthetic-user study as a first research pass?',
  ],
}

const HOME_COPY = {
  zh: {
    defaultTopic: '年轻人越来越依赖短视频学习，深度阅读会被削弱吗？',
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
    importedAudienceTitle: '已导入人群数据',
    addMoreFiles: '继续添加',
    removeFile: '移除',
    importFileLimit: (max: number) => `一次最多上传 ${max} 份人群数据`,
    selectedFiles: '已选择',
    clearFiles: '清除',
    audiencePlaceholder: '描述目标用户群体的特征，例如：25-35岁的互联网产品经理，关注AI工具效率...',
    topic: '讨论话题',
    topicPlaceholder: '输入讨论话题...',
    addTopicMaterial: '添加话题资料',
    topicMaterialHint: '支持 CSV、Excel、Word、TXT；会作为后台话题语境影响熟悉度、相关度和误解点',
    topicMaterialUploading: '正在解析话题资料...',
    duration: '对话时长',
    durationOptions: {
      short: '短 · 约 30 分钟',
      medium: '中 · 约 60 分钟',
      long: '长 · 约 90 分钟',
    },
    agents: '虚拟用户数量',
    people: '人',
    model: '当前模型服务',
    modelDetecting: '正在识别...',
    modelNotConfigured: '未检测到完整模型配置',
    modelNeedsKey: '需要填写 API Key',
    modelSourcePage: '页面配置',
    modelSourceEnv: '.env',
    generating: '生成中...',
    cancelGeneration: '取消生成',
    generate: '生成虚拟用户',
    generateFromData: '基于来源数据生成人设',
    loadingUsers: (count: string) => `正在生成 ${count} 个虚拟用户...`,
    loadingFromData: (count: string) => `正在从来源数据生成 ${count} 个记忆化人设...`,
    generationNotice: '生成可能需要 1-3 分钟，请不要关闭页面或离开当前流程。',
    leaveWarning: '人设还在生成中，离开页面会中断本次生成。',
    flowTitle: '生成流程',
    flowStep: (current: number, total: number) => `${current}/${total}`,
    streamNoResult: '接口没有返回最终人设结果',
    networkError: '本地服务连接中断，请确认 npm run dev 仍在运行后重试。',
    cancelled: '已取消生成',
    topicMaterialFlowTitle: '话题资料处理流程',
    topicMaterialSteps: ['读取上传文件', '提取可用于话题理解的背景材料', '写入本次讨论的私有语境'],
    buildPrompt: '→ 构建 prompt...',
    parseFiles: '→ 解析来源文件并切分记忆素材...',
    synthesizeEvidence: '→ 蒸馏消费习惯、认知方式和语言风格...',
    callLlm: '→ 调用 LLM 生成角色（预计 20-40s）...',
    parseResult: '→ 解析结果...',
    slow: '仍在生成中，请继续等待；如长时间无响应再检查网络。',
    invalidAgents: '未返回有效角色数据',
    tagline: '将你的人群数据蒸馏成可对话的 AI 虚拟用户',
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
    importedAudienceTitle: 'Audience data imported',
    addMoreFiles: 'Add more',
    removeFile: 'Remove',
    importFileLimit: (max: number) => `Upload up to ${max} audience files at once`,
    selectedFiles: 'Selected',
    clearFiles: 'Clear',
    audiencePlaceholder: 'Describe the target audience, e.g. US SaaS product managers aged 25-35 who care about AI productivity tools...',
    topic: 'Discussion topic',
    topicPlaceholder: 'Enter a topic...',
    addTopicMaterial: 'Add topic material',
    topicMaterialHint: 'Supports CSV, Excel, Word, and TXT. Used as private topic context for familiarity, relevance, and misunderstandings.',
    topicMaterialUploading: 'Parsing topic material...',
    duration: 'Duration',
    durationOptions: {
      short: 'Short · about 30 min',
      medium: 'Medium · about 60 min',
      long: 'Long · about 90 min',
    },
    agents: 'Virtual users',
    people: 'users',
    model: 'Current model provider',
    modelDetecting: 'Detecting...',
    modelNotConfigured: 'No complete model configuration detected',
    modelNeedsKey: 'API Key required',
    modelSourcePage: 'Page settings',
    modelSourceEnv: '.env',
    generating: 'Generating...',
    cancelGeneration: 'Cancel',
    generate: 'Generate virtual users',
    generateFromData: 'Generate personas from source data',
    loadingUsers: (count: string) => `Generating ${count} virtual users...`,
    loadingFromData: (count: string) => `Generating ${count} memory-grounded personas from source data...`,
    generationNotice: 'Generation may take 1-3 minutes. Please keep this page open.',
    leaveWarning: 'Personas are still being generated. Leaving will interrupt this run.',
    flowTitle: 'Generation flow',
    flowStep: (current: number, total: number) => `${current}/${total}`,
    streamNoResult: 'The API did not return final persona data',
    networkError: 'The local service connection was interrupted. Confirm npm run dev is still running and try again.',
    cancelled: 'Generation cancelled',
    topicMaterialFlowTitle: 'Topic material flow',
    topicMaterialSteps: ['Reading uploaded files', 'Extracting background material for topic understanding', 'Saving it as private context for this discussion'],
    buildPrompt: '→ Building prompt...',
    parseFiles: '→ Parsing source files into memory material...',
    synthesizeEvidence: '→ Distilling habits, cognitive style, and language register...',
    callLlm: '→ Calling LLM to generate personas (about 20-40s)...',
    parseResult: '→ Parsing result...',
    slow: 'Still generating. Keep waiting; check the network only if it stays unresponsive.',
    invalidAgents: 'No valid persona data returned',
    tagline: 'Distill your audience data into conversational AI personas',
  },
}

const ALL_DEFAULT_TOPICS = [...RANDOM_TOPICS.zh, ...RANDOM_TOPICS.en]
const MAX_AUDIENCE_FILES = 6

function fileIdentity(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  if (size >= 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${size} B`
}
type RuntimeModelProvider = 'gpt-5.5' | 'gemini'

interface RuntimeModelInfo {
  source: 'page' | 'env'
  configured: boolean
  protocol: LLMProtocol
  providerName: string
  model: string
  baseUrl: string
  modelProvider: RuntimeModelProvider
}

interface PersonaGenerationResponse {
  agents?: SimAgent[]
}

function getEstimatedStepIndex(steps: Array<{ estimatedAt: number }>, elapsed: number): number {
  let index = 0
  for (let i = 0; i < steps.length; i++) {
    if (elapsed >= steps[i].estimatedAt) index = i
  }
  return index
}

async function readProgressiveResponse<T>(
  res: Response,
  onProgress: (progress: FlowProgressEvent) => void,
  missingResultMessage: string
): Promise<T> {
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    return await res.json() as T
  }

  if (!res.body) throw new Error(missingResultMessage)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = ''
  let finalResult: T | null = null

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
        const data = JSON.parse(line.slice(6)) as Record<string, unknown>
        if (currentEvent === 'progress') {
          onProgress(data as unknown as FlowProgressEvent)
        } else if (currentEvent === 'result') {
          finalResult = data as T
        } else if (currentEvent === 'error') {
          throw new Error(String(data.message || missingResultMessage))
        }
        currentEvent = ''
      }
    }
  }

  if (finalResult) return finalResult
  throw new Error(missingResultMessage)
}

async function createHttpError(res: Response): Promise<Error> {
  const text = await res.text()
  try {
    const data = JSON.parse(text) as { error?: string; message?: string }
    return new Error(data.error || data.message || `API ${res.status}`)
  } catch {
    return new Error(text || `API ${res.status}`)
  }
}

function formatGenerationError(err: unknown, locale: 'zh' | 'en', networkError: string): string {
  const raw = getRawErrorMessage(err)
  if (/Failed to fetch|NetworkError|Load failed|ERR_CONNECTION_REFUSED|ERR_EMPTY_RESPONSE/i.test(raw)) {
    return networkError
  }
  if (isAbortLikeError(err)) {
    return getModelInterruptedMessage(locale)
  }
  const cleaned = raw.replace(/^Error:\s*/, '')
  if (locale === 'zh' && cleaned.includes('No usable text found')) {
    return '上传文件中没有解析到可用文本，请换一个 CSV、Excel、Word 或文本文件。'
  }
  if (locale === 'zh' && cleaned.includes('No files uploaded')) {
    return '没有检测到上传文件，请重新选择文件。'
  }
  return cleaned
}

function isAbortError(err: unknown): boolean {
  return isAbortLikeError(err)
}

export default function ConfigPage() {
  const router = useRouter()
  const { setConfig, setAgents, setStatus, reset } = useSimulationStore()
  const locale = useLocaleStore((s) => s.locale)
  const pageModelConfig = useBYOKStore((s) => s.config)
  const hydrateModelConfig = useBYOKStore((s) => s.hydrate)
  const getLLMConfig = useBYOKStore((s) => s.getRequestConfig)
  const copy = HOME_COPY[locale]
  const [crowdDescription, setCrowdDescription] = useState('')
  const [topic, setTopic] = useState(HOME_COPY.zh.defaultTopic)
  const [topicContext, setTopicContext] = useState('')
  const [durationTier, setDurationTier] = useState<RoundtableDurationTier>('medium')
  const [agentCount, setAgentCount] = useState('4')
  const [model, setModel] = useState<RuntimeModelProvider>('gpt-5.5')
  const [envModelInfo, setEnvModelInfo] = useState<RuntimeModelInfo | null>(null)
  const [activeMode, setActiveMode] = useState<'roundtable' | 'interview' | 'abtest'>('roundtable')
  const [loading, setLoading] = useState(false)
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [topicFiles, setTopicFiles] = useState<File[]>([])
  const [topicUploadLoading, setTopicUploadLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [genError, setGenError] = useState('')
  const [flowMode, setFlowMode] = useState<GenerationFlowKind>('generated')
  const [flowProgress, setFlowProgress] = useState<FlowProgressEvent | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generationAbortRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const topicFileInputRef = useRef<HTMLInputElement | null>(null)
  const isImportMode = importFiles.length > 0
  const hasPageModelConfig = Boolean(pageModelConfig.apiKey.trim() && pageModelConfig.baseUrl.trim() && pageModelConfig.model.trim())
  const pageModelInfo: RuntimeModelInfo | null = hasPageModelConfig
    ? {
        source: 'page',
        configured: true,
        protocol: pageModelConfig.protocol,
        providerName: detectProviderName(pageModelConfig.baseUrl),
        model: pageModelConfig.model,
        baseUrl: pageModelConfig.baseUrl,
        modelProvider: modelProviderFromProtocol(pageModelConfig.protocol),
      }
    : null
  const currentModelInfo = pageModelInfo || envModelInfo
  const effectiveModel = currentModelInfo?.modelProvider || model
  const durationPreset = getRoundtableDurationPreset(durationTier)
  const modelTitle = currentModelInfo
    ? `${currentModelInfo.providerName} · ${currentModelInfo.model}`
    : copy.modelDetecting

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
    if (!loading) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = copy.leaveWarning
      return copy.leaveWarning
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [loading, copy.leaveWarning])

  useEffect(() => {
    hydrateModelConfig()
  }, [hydrateModelConfig])

  useEffect(() => {
    let active = true
    fetch('/api/model-config')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        setEnvModelInfo({
          source: 'env',
          configured: Boolean(data.configured),
          protocol: data.protocol === 'gemini' ? 'gemini' : 'openai-compatible',
          providerName: String(data.providerName || 'Custom'),
          model: String(data.model || ''),
          baseUrl: String(data.baseUrl || ''),
          modelProvider: data.modelProvider === 'gemini' ? 'gemini' : 'gpt-5.5',
        })
      })
      .catch(() => {
        if (active) setEnvModelInfo(null)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (currentModelInfo?.modelProvider) setModel(currentModelInfo.modelProvider)
  }, [currentModelInfo?.modelProvider])

  useEffect(() => {
    setTopic((prev) => (!prev.trim() || ALL_DEFAULT_TOPICS.includes(prev)) ? copy.defaultTopic : prev)
  }, [copy.defaultTopic])

  function randomizeCrowd() {
    const options = RANDOM_CROWDS[locale]
    const pick = options[Math.floor(Math.random() * options.length)]
    setImportFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    setCrowdDescription(pick)
  }

  function randomizeTopic() {
    const options = RANDOM_TOPICS[locale]
    const pick = options[Math.floor(Math.random() * options.length)]
    setTopic(pick)
  }

  function handleFilesSelected(files: FileList | null) {
    setGenError('')
    const selected = files ? Array.from(files) : []
    if (selected.length === 0) return

    setImportFiles((current) => {
      const seen = new Set(current.map(fileIdentity))
      const merged = [...current]
      for (const file of selected) {
        const key = fileIdentity(file)
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(file)
      }

      if (merged.length > MAX_AUDIENCE_FILES) {
        setGenError(copy.importFileLimit(MAX_AUDIENCE_FILES))
        return merged.slice(0, MAX_AUDIENCE_FILES)
      }
      return merged
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImportFile(index: number) {
    setGenError('')
    setImportFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clearImportFiles() {
    setGenError('')
    setImportFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleTopicFilesSelected(files: FileList | null) {
    const selected = files ? Array.from(files) : []
    setGenError('')
    if (selected.length === 0) {
      setTopicFiles([])
      setTopicContext('')
      return
    }

    setTopicFiles(selected)
    setTopicUploadLoading(true)
    try {
      const form = new FormData()
      selected.forEach((file) => form.append('files', file))
      const res = await fetch('/api/import-topic-context', {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        throw await createHttpError(res)
      }

      const data = await res.json()
      setTopicContext(String(data.text || ''))
    } catch (err) {
      console.error(err)
      setGenError(formatGenerationError(err, locale, copy.networkError))
      setTopicFiles([])
      setTopicContext('')
      if (topicFileInputRef.current) topicFileInputRef.current.value = ''
    } finally {
      setTopicUploadLoading(false)
    }
  }

  async function handleImportGenerate() {
    if (importFiles.length === 0) return

    const abortController = new AbortController()
    generationAbortRef.current = abortController
    reset()
    setGenError('')
    setFlowMode('imported')
    setFlowProgress(null)
    setConfig({ topic, topicContext, mode: 'imported', duration: durationPreset.legacyMinutes, durationTier, model: effectiveModel, locale })
    setStatus('generating')
    setLoading(true)

    try {
      const form = new FormData()
      form.set('topic', topic)
      form.set('topicContext', topicContext)
      form.set('agentCount', agentCount)
      form.set('model', effectiveModel)
      form.set('language', locale)
      const llmConfig = getLLMConfig()
      if (llmConfig) form.set('llmConfig', JSON.stringify(llmConfig))
      importFiles.forEach((file) => form.append('files', file))

      const res = await fetch('/api/import-population', {
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
        body: form,
        signal: abortController.signal,
      })

      if (!res.ok) {
        throw await createHttpError(res)
      }

      const data = await readProgressiveResponse<PersonaGenerationResponse>(
        res,
        setFlowProgress,
        copy.streamNoResult
      )
      const agents = data.agents || []
      if (agents.length > 0) {
        setAgents(agents)
        setStatus('previewing')
        router.push('/personas')
      } else {
        throw new Error(copy.invalidAgents)
      }
    } catch (err) {
      if (abortController.signal.aborted && isAbortError(err)) {
        setGenError('')
        setFlowProgress(null)
        setStatus('idle')
        return
      }
      console.error(err)
      setGenError(formatGenerationError(err, locale, copy.networkError))
      setStatus('idle')
    } finally {
      if (generationAbortRef.current === abortController) {
        generationAbortRef.current = null
      }
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (isImportMode) {
      await handleImportGenerate()
      return
    }

    reset()
    const abortController = new AbortController()
    generationAbortRef.current = abortController
    setGenError('')
    setFlowMode('generated')
    setFlowProgress(null)
    setConfig({ topic, topicContext, mode: 'generated', duration: durationPreset.legacyMinutes, durationTier, model: effectiveModel, locale })
    setStatus('generating')
    setLoading(true)

    try {
      const res = await fetch('/api/generate-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          topic,
          topicContext,
          crowdDescription,
          agentCount: Number(agentCount),
          model: effectiveModel,
          language: locale,
          llmConfig: getLLMConfig(),
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        throw await createHttpError(res)
      }

      const data = await readProgressiveResponse<PersonaGenerationResponse>(
        res,
        setFlowProgress,
        copy.streamNoResult
      )
      const agents = data.agents || []
      if (agents.length > 0) {
        setAgents(agents)
        setStatus('previewing')
        router.push('/personas')
      } else {
        throw new Error(copy.invalidAgents)
      }
    } catch (err) {
      if (abortController.signal.aborted && isAbortError(err)) {
        setGenError('')
        setFlowProgress(null)
        setStatus('idle')
        return
      }
      console.error(err)
      setGenError(formatGenerationError(err, locale, copy.networkError))
      setStatus('idle')
    } finally {
      if (generationAbortRef.current === abortController) {
        generationAbortRef.current = null
      }
      setLoading(false)
    }
  }

  function handleCancelGeneration() {
    generationAbortRef.current?.abort()
    generationAbortRef.current = null
    setLoading(false)
    setFlowProgress(null)
    setGenError('')
    setStatus('idle')
  }

  const activeFlowKind = loading ? flowMode : isImportMode ? 'imported' : 'generated'
  const flowSteps = getGenerationFlowSteps(locale, activeFlowKind)
  const serverStepIndex = flowProgress ? flowSteps.findIndex((step) => step.id === flowProgress.step) : -1
  const activeStepIndex = serverStepIndex >= 0 ? serverStepIndex : getEstimatedStepIndex(flowSteps, elapsed)
  const flowProgressPercent = Math.min(96, Math.max(8, ((activeStepIndex + 0.45) / flowSteps.length) * 100))

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
          <p className="mt-2 text-sm text-muted-foreground">{copy.tagline}</p>
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
                  <button
                    type="button"
                    onClick={randomizeCrowd}
                    disabled={isImportMode}
                    className={`text-xs transition-colors ${
                      isImportMode
                        ? 'cursor-not-allowed text-muted-foreground/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
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
                    {isImportMode ? copy.addMoreFiles : copy.importAudience}
                  </Button>
                </div>
              </div>
              {isImportMode ? (
                <div className="rounded-lg border bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-medium text-foreground">{copy.importedAudienceTitle}</div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={clearImportFiles}
                    >
                      {copy.clearFiles}
                    </button>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {importFiles.map((file, index) => (
                      <div key={fileIdentity(file)} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/60 bg-card/70 px-2.5 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs text-foreground">{file.name}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{formatFileSize(file.size)}</div>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => removeImportFile(index)}
                        >
                          {copy.removeFile}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Textarea
                  value={crowdDescription}
                  onChange={(e) => setCrowdDescription(e.target.value)}
                  placeholder={copy.audiencePlaceholder}
                  rows={3}
                />
              )}
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">{copy.importHint}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{copy.topic}</Label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={randomizeTopic} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {copy.random}
                  </button>
                  <input
                    ref={topicFileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.docx,.txt,.md"
                    multiple
                    className="hidden"
                    onChange={(e) => handleTopicFilesSelected(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => topicFileInputRef.current?.click()}
                    disabled={topicUploadLoading}
                  >
                    {topicUploadLoading ? copy.topicMaterialUploading : copy.addTopicMaterial}
                  </Button>
                </div>
              </div>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={copy.topicPlaceholder}
              />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">{copy.topicMaterialHint}</p>
                {topicUploadLoading && (
                  <div className="rounded-md border bg-background/60 px-3 py-2 text-[11px]">
                    <div className="mb-1 font-medium text-foreground/80">{copy.topicMaterialFlowTitle}</div>
                    <div className="space-y-1 text-muted-foreground">
                      {copy.topicMaterialSteps.map((step, index) => (
                        <div key={step} className="flex items-center gap-2">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[9px]">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {topicFiles.length > 0 && (
                  <div className="rounded-md border bg-background/60 px-3 py-2 text-[11px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {copy.selectedFiles}: {topicFiles.map((file) => file.name).join(', ')}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setTopicFiles([])
                          setTopicContext('')
                          if (topicFileInputRef.current) topicFileInputRef.current.value = ''
                        }}
                      >
                        {copy.clearFiles}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{copy.duration}</Label>
                <Select value={durationTier} onValueChange={(v) => setDurationTier(v as RoundtableDurationTier)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{copy.durationOptions[durationTier]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROUNDTABLE_DURATION_PRESETS) as RoundtableDurationTier[]).map((key) => (
                      <SelectItem key={key} value={key}>{copy.durationOptions[key]}</SelectItem>
                    ))}
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
                <div className="flex h-9 w-full min-w-0 items-center rounded-lg border border-input bg-transparent px-2.5 dark:bg-input/30">
                  <span className="truncate text-sm leading-tight">
                    {currentModelInfo ? (currentModelInfo.configured ? modelTitle : copy.modelNotConfigured) : copy.modelDetecting}
                  </span>
                </div>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleGenerate} disabled={loading || topicUploadLoading || !topic.trim()}>
              {loading ? copy.generating : isImportMode ? copy.generateFromData : copy.generate}
            </Button>

            {genError && !loading && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-[11px] text-destructive font-mono">{genError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

        <Dialog open={loading}>
          <DialogContent showCloseButton={false} className="max-h-[86vh] max-w-[calc(100vw-2rem)] overflow-hidden border bg-popover/95 p-0 backdrop-blur-md sm:max-w-3xl lg:max-w-4xl xl:max-w-[960px]">
            <div className="space-y-4 p-5">
              <DialogHeader className="gap-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DialogTitle className="text-base">
                      {flowMode === 'imported' ? copy.loadingFromData(agentCount) : copy.loadingUsers(agentCount)}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs">
                      {flowProgress?.label || flowSteps[activeStepIndex]?.title}
                    </DialogDescription>
                  </div>
                  <span className="shrink-0 font-mono text-sm text-muted-foreground">{elapsed}s</span>
                </div>
              </DialogHeader>

              <div className="space-y-1.5">
                <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-200">
                  {copy.generationNotice}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/65 transition-all duration-1000 ease-out"
                    style={{ width: `${flowProgressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{copy.flowTitle}</span>
                  <span className="font-mono">{copy.flowStep(activeStepIndex + 1, flowSteps.length)}</span>
                </div>
              </div>

              <div className="max-h-[54vh] overflow-y-auto pr-1">
                <ol className="space-y-2">
                  {flowSteps.map((step, index) => {
                    const isDone = index < activeStepIndex
                    const isActive = index === activeStepIndex
                    return (
                      <li
                        key={step.id}
                        className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                          isActive ? 'bg-foreground/[0.07]' : ''
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                            isDone
                              ? 'border-emerald-500/65 bg-emerald-500/15 text-emerald-500'
                              : isActive
                                ? 'border-foreground/75 text-foreground'
                                : 'border-border text-muted-foreground'
                          }`}
                        >
                          {isDone ? (
                            '✓'
                          ) : isActive ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>
                            {step.title}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {isActive && flowProgress?.detail ? flowProgress.detail : step.detail}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
                {elapsed >= 60 && (
                  <p className="mt-3 text-xs text-yellow-500">{copy.slow}</p>
                )}
              </div>

              <div className="flex justify-end border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelGeneration}
                  className="border-destructive/70 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {copy.cancelGeneration}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
