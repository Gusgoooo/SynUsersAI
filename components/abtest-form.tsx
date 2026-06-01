'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useABTestStore, type Concept, type Segment } from '@/lib/abtest-store'
import { RichTextEditor } from '@/components/rich-text-editor'
import { Stepper, Step } from '@/components/ui/stepper'
import { marked } from 'marked'
import { useLocaleStore } from '@/lib/locale-store'
import { useBYOKStore } from '@/lib/byok-store'

const RANDOM_CONCEPTS = [
  `# FlowMind AI写作助手 - 产品需求文档

## 1. 产品概述

FlowMind是一款面向内容创作者和知识工作者的AI写作辅助工具。核心定位是"思维到文字的无缝桥梁"，通过深度理解用户意图，帮助用户从模糊想法快速产出结构化、高质量的文字内容。

### 1.1 目标用户
- 自媒体创作者（公众号、小红书、知乎）
- 企业市场/PR部门的内容团队
- 独立咨询师和自由撰稿人
- 技术文档编写者

### 1.2 核心价值主张
"不是帮你写，而是帮你想清楚再写。"区别于纯生成式AI，FlowMind强调思维辅助：先帮用户梳理逻辑框架，再逐段扩展填充。

## 2. 功能规格

### 2.1 智能大纲生成
- 输入：一句话主题/一段模糊描述
- 输出：3-5级结构化大纲
- 支持多种文体模板（技术博客、产品分析、行业报告、品牌软文）
- 大纲可手动调整拖拽，AI实时适配内容策略

### 2.2 语境记忆引擎
- 单次会话最长记忆5000字上下文
- 支持导入"品牌语料库"（品牌调性、专有名词、历史文章）
- 自动学习用户写作风格（需3篇以上历史文章训练）

### 2.3 多语言能力
- 中英日韩四语互译
- 不是机械翻译——保持原文语气和文化适配
- 支持"写中文→自动出英文版"同步双语创作

### 2.4 平台集成
- VS Code插件（Markdown实时AI补全）
- Notion侧边栏助手
- 飞书文档原生集成
- Chrome浏览器扩展（任意网页写作框内激活）

### 2.5 团队协作版
- 共享品牌语料库
- 审核流：AI初稿→人工审核→发布
- 内容日历与排期管理
- 统一风格指南强制执行

## 3. 商业模式

### 3.1 定价策略
| 版本 | 价格 | 包含内容 |
|------|------|----------|
| 免费版 | ¥0 | 每日5次生成，无记忆功能 |
| 个人Pro | ¥99/月 | 无限生成+记忆引擎+多语言 |
| 团队版 | ¥199/人/月 | Pro全部+协作+品牌语料库 |
| 企业定制 | 联系销售 | 私有化部署+API+专属模型微调 |

### 3.2 获客策略
- SEO内容营销（用自己的产品写推广文章）
- KOL种草合作（选20位头部自媒体人免费使用3个月）
- 免费版漏斗：限制次数引导升级
- 企业渠道：通过飞书/钉钉应用市场分发

## 4. 技术架构

- 底层模型：自研7B参数模型 + GPT-4o API混合路由
- 短文本（<500字）：本地7B模型处理（低延迟、低成本）
- 长文本/复杂任务：路由到GPT-4o（高质量）
- 记忆引擎：向量数据库（Qdrant）存储用户语料
- 部署：阿里云函数计算（按量付费，弹性扩容）

## 5. 里程碑

- M1（已完成）：核心写作功能上线
- M2（进行中）：多语言+VS Code插件
- M3（Q3规划）：团队版+品牌语料库
- M4（Q4规划）：企业私有化部署方案

## 6. 竞品对比

| | FlowMind | Jasper | Copy.ai | 文心一言 |
|---|---|---|---|---|
| 中文质量 | ★★★★★ | ★★★ | ★★★ | ★★★★ |
| 思维辅助 | ★★★★★ | ★★ | ★★ | ★★★ |
| 平台集成 | ★★★★ | ★★★★ | ★★★ | ★★ |
| 定价 | ¥99/月 | $49/月 | $36/月 | 免费/¥59.9 |
| 数据安全 | 国内合规 | 海外服务器 | 海外服务器 | 国内合规 |`,

  `# WordForge 全自动内容工厂 - 产品需求文档

## 1. 产品概述

WordForge是一个面向中小企业和个体创业者的AI内容批量生产平台。核心定位是"内容流水线"，通过关键词+模板即可批量生成SEO优化文章、社媒帖子、产品描述等内容，追求量大、成本低、发布快。

### 1.1 目标用户
- 中小电商卖家（需要大量商品描述和种草文）
- SEO从业者（批量产出长尾关键词文章）
- 矩阵号运营者（同时运营10+账号需要海量内容）
- 预算有限的初创团队（没钱雇专职写手）

### 1.2 核心价值主张
"一个人就是一个内容团队。"不追求单篇极致质量，而是强调规模化生产效率。输入关键词列表，10分钟生成100篇各不相同的文章，直接铺到全渠道。

## 2. 功能规格

### 2.1 批量生成引擎
- 输入：关键词列表 / CSV / 竞品URL
- 输出：一次性生成10-500篇文章
- 自动变体：同一主题生成多个不同角度版本（避免平台判重复）
- 支持模板：种草文/测评/教程/新闻稿/产品描述/SEO长文

### 2.2 SEO自动优化
- 自动插入长尾关键词（密度可调2%-5%）
- 标题自动A/B生成（每篇3个备选标题）
- meta description自动生成
- 内链建议（关联已发布文章）
- 自动生成FAQ结构化数据

### 2.3 多平台分发
- 一键发布到：WordPress/公众号/小红书/知乎/头条
- 自动适配各平台格式（字数限制/图文比/话题标签）
- 定时发布队列（错峰发布避免被风控）
- 发布后自动监测排名变化

### 2.4 素材库
- 内置1000+行业模板
- 竞品文章一键改写（降重率<15%）
- 图片自动配图（从免费图库匹配）
- 数据自动更新（价格/日期等动态字段）

### 2.5 团队协作
- 多账号管理面板
- 审核流水线（AI生成→人工抽检→批量发布）
- 产出统计看板（日产量/发布量/收录量）

## 3. 商业模式

### 3.1 定价策略
| 版本 | 价格 | 包含内容 |
|------|------|----------|
| 免费试用 | ¥0 | 每天3篇，带水印 |
| 个人版 | ¥39/月 | 每月500篇，5个平台 |
| 专业版 | ¥149/月 | 无限篇数+SEO工具+竞品改写 |
| 企业版 | ¥499/月 | 专业版+API+多人协作+私有模板 |

### 3.2 获客策略
- 免费SEO检测工具引流（输入URL出报告，引导用"AI帮你改"）
- 淘宝/拼多多卖家群精准投放
- 短视频展示"10分钟生成100篇"效果
- 代理商分销（给MCN机构/代运营公司批发价）

## 4. 技术架构

- 底层模型：纯API调用（Claude/GPT/国产大模型多路由，按成本最低路由）
- 去重引擎：simhash + 语义相似度双重校验，确保批量生成不互相重复
- 分发引擎：各平台API + RPA自动化（无API的平台用浏览器自动操作）
- 部署：Serverless架构（按调用量付费，峰值弹性扩容）

## 5. 里程碑

- M1（已完成）：批量生成 + WordPress发布
- M2（进行中）：SEO工具链 + 小红书/公众号适配
- M3（Q3规划）：竞品改写 + 多语言
- M4（Q4规划）：企业版 + API开放

## 6. 竞品对比

| | WordForge | FlowMind | 5118 | 火车头采集 |
|---|---|---|---|---|
| 单篇质量 | ★★★ | ★★★★★ | ★★ | ★ |
| 批量效率 | ★★★★★ | ★★ | ★★★★ | ★★★★★ |
| SEO优化 | ★★★★★ | ★★ | ★★★★★ | ★★★ |
| 多平台分发 | ★★★★ | ★★★★ | ★★ | ★★★ |
| 定价 | ¥39-499/月 | ¥99-199/月 | ¥99-399/月 | ¥880买断 |
| 适合场景 | 量产铺渠道 | 精品内容创作 | SEO+数据 | 采集改写 |`,
]

const RANDOM_SEGMENTS = [
  `25-35岁的互联网产品经理群体。这个群体主要分布在一线和新一线城市（北上广深杭成），就职于中型互联网公司（B轮-D轮，200-2000人规模）。年薪区间30-60万，月可自由支配收入约8000-15000元。

工作特征：每天处理大量文档（PRD、竞品分析、数据报告），会议占工作时间40%以上。常用工具包括：飞书/钉钉（协作）、Figma（设计协同）、Jira（项目管理）、Notion（个人笔记）、各种数据分析平台。对新工具接受度高，平均每月会试用2-3款新产品。

消费心理：属于"品质导向+效率至上"型消费者。愿意为明确提升工作效率的工具付费（每月工具订阅预算300-500元），但要求清晰的ROI证明。决策模式为"快速试用→体验好就付费→不好立刻放弃"，试用期容忍度约3天。高度依赖同行推荐（产品经理社群、即刻、Twitter/X），KOL影响力强于广告。

痛点与需求：1）信息过载——每天接收几百条消息/邮件/通知，需要高效筛选和处理；2）写作效率——每周需要产出2-3份文档，从初稿到定稿耗时3-5小时/份；3）跨团队协作摩擦大——设计/开发/运营各用各的工具，信息割裂；4）数据分析能力瓶颈——有数据思维但SQL/Python不熟练，依赖数据组排期。`,

  `18-24岁的在校大学生（本科和硕士研究生）。分布在全国各大高校，以985/211和普通一本为主。月生活费1500-3000元（不含学费住宿），可自由支配金额有限（约500-1000元/月）。

生活特征：时间碎片化程度高（课程+社团+兼职+社交），注意力集中时间短。几乎所有信息获取来自手机——小红书（种草决策）、B站（学习娱乐）、微信（社交通讯）、知乎（求职信息）。对"学生优惠""教育版"极度敏感，会为省钱花大量时间比价和找替代方案。

消费心理：典型的"穷但要面子"心态——追求高性价比，但不愿承认自己在乎价格。更容易被"同龄人都在用""学长学姐推荐"说服，从众心理强。对订阅制有天然抵触（"每月都要花钱太心痛"），更接受买断制或免费+广告模式。一旦找到满意的免费替代品，几乎不可能付费。但如果能显著提升绩点/求职竞争力，愿意"咬牙投资"。

典型使用场景：1）论文写作和文献管理——每学期至少2-3篇课程论文+毕业论文；2）小组作业协作——4-5人临时组队，需要在线文档/PPT协作；3）考研/考公/求职备考——大量知识记忆和整理需求；4）自媒体副业——有30%的学生在运营个人账号（小红书/B站），需要内容创作工具。`,

  `35-50岁的企业中高层管理者（总监/VP/C-level），就职于500人以上规模的中大型企业（年营收1亿+），分布在各行业（互联网/金融/制造/零售）。年薪80-200万，个人工具消费预算不是问题（公司报销），但极度关注团队采购的ROI。

工作特征：日程被会议填满（每天6-8个会议），几乎不亲自操作具体工具——而是"指定工具让团队用"。决策链路长（需要评估安全合规→试用→小范围推广→全员部署），平均采购决策周期3-6个月。高度依赖IT部门的安全审核和行政部门的预算审批。

消费心理：B2B采购决策者心态——不看个人体验看团队效能，不看功能多少看解决的业务问题大小。对"免费"有天然不信任（"免费的东西不敢让公司数据放进去"）。品牌和口碑极度重要——会参考Gartner/IDC报告、同行业标杆企业的选择。价格敏感度低但需要"说得过去的报价逻辑"（不能比竞品贵太多而无法向CFO解释）。

痛点与决策触发点：1）团队效率——"人太贵了，能不能用工具把3个人的活让1个人干"；2）数据安全——"出了数据泄露我得背锅"；3）合规要求——"ISO27001/等保三级/SOC2必须有"；4）管理可视化——"我要随时看到团队的产出数据，别让我去问"；5）减少工具碎片化——"团队用了十几个工具，信息全割裂了"。`,
]

const RANDOM_CONCEPTS_EN = [
  `# FlowMind AI Writing Assistant - Product Requirements

## Overview

FlowMind helps knowledge workers turn fuzzy ideas into structured, polished writing. Instead of only generating text, it guides users through outlining, logic refinement, and draft expansion.

## Target Users

- Content creators and newsletter writers
- Marketing and PR teams
- Independent consultants
- Technical writers and product managers

## Core Value Proposition

"Not just writing for you, but helping you think clearly before you write."

## Key Features

- Intelligent outline generation from a short idea
- Brand voice memory and reusable writing context
- Multi-language drafting and localization
- Integrations with Notion, VS Code, and browser writing fields

## Pricing

- Free: 5 generations per day
- Pro: $19/month for unlimited generation and memory
- Team: $39/user/month with shared brand libraries`,
  `# WordForge Content Factory - Product Requirements

## Overview

WordForge is a high-volume AI content production platform for small businesses, ecommerce sellers, and SEO teams. It focuses on speed, scale, and channel distribution.

## Target Users

- Small ecommerce teams that need product descriptions
- SEO operators producing long-tail content
- Agencies running multiple social accounts
- Budget-conscious startups without a content team

## Core Value Proposition

"One person can operate like a full content team."

## Key Features

- Batch generation from keywords, CSV files, or competitor URLs
- SEO optimization and metadata generation
- Multi-channel formatting for blogs and social media
- Duplicate reduction and content variation controls

## Pricing

- Starter: $9/month
- Pro: $39/month
- Business: $129/month with team workflows and API access`,
]

const RANDOM_SEGMENTS_EN = [
  `25-35 year-old SaaS product managers in the United States and Canada. They work at seed to Series C software companies, spend much of their week in meetings and documentation, and are already familiar with Notion, Jira, Figma, Slack, and AI productivity tools.

They are willing to pay for software that clearly saves time, but they expect a short path to ROI. They usually test tools quickly, ask peers for recommendations, and abandon products that do not show value within the first few days.

Common pain points include information overload, writing specs under time pressure, fragmented cross-functional communication, and limited access to analytics support.`,
  `18-24 year-old college students and graduate students. They are curious about new technology, but budget constrained. They rely on TikTok, YouTube, Reddit, Discord, and peer recommendations for tool discovery.

They are skeptical of recurring subscriptions unless the product directly improves grades, job prospects, or creative output. Free tiers, student discounts, and social proof matter a lot.

Typical use cases include essay writing, group projects, exam preparation, internship applications, and side projects such as newsletters or short-form content creation.`,
  `35-50 year-old senior managers, directors, and executives at mid-sized and enterprise companies. They care less about personal convenience and more about team productivity, risk, procurement, security, and measurable ROI.

They rarely adopt tools impulsively. Purchase decisions usually involve security review, pilot deployment, budget approval, and internal rollout planning.

Their main concerns are data protection, compliance, total cost, employee adoption, and whether the product can reduce operational friction at team scale.`,
]

const COPY = {
  zh: {
    steps: {
      concepts: '测试方案',
      segments: '目标人群',
      config: '测试配置',
    },
    addConcept: '+ 添加方案',
    addSegment: '+ 添加人群',
    conceptLabel: (i: number) => `方案 ${String.fromCharCode(65 + i)}`,
    segmentLabel: (i: number) => `人群 ${i + 1}`,
    randomFill: '随机填充',
    upload: '上传',
    conceptPlaceholder: '直接粘贴方案内容（支持富文本格式）...',
    segmentPlaceholder: '描述该人群特征：年龄、职业、收入、消费习惯、关注点...',
    next: '下一步',
    previous: '上一步',
    groupSize: '每组人数',
    people: '人',
    model: 'AI 模型',
    scale: '测试规模',
    conceptUnit: '方案',
    segmentUnit: '人群',
    evalUnit: '次评估',
    analyzing: '分析中...',
    start: '开始生成',
    defaultConcept: (i: number) => `方案${String.fromCharCode(65 + i)}`,
    defaultSegment: (i: number) => `人群${i + 1}`,
  },
  en: {
    steps: {
      concepts: 'Concepts',
      segments: 'Audience',
      config: 'Test setup',
    },
    addConcept: '+ Add concept',
    addSegment: '+ Add segment',
    conceptLabel: (i: number) => `Concept ${String.fromCharCode(65 + i)}`,
    segmentLabel: (i: number) => `Segment ${i + 1}`,
    randomFill: 'Random fill',
    upload: 'Upload',
    conceptPlaceholder: 'Paste the concept, product brief, landing-page copy, or PRD here...',
    segmentPlaceholder: 'Describe the audience: age, role, income, habits, concerns, context...',
    next: 'Next',
    previous: 'Previous',
    groupSize: 'Users / segment',
    people: 'users',
    model: 'AI model',
    scale: 'Test scale',
    conceptUnit: 'concepts',
    segmentUnit: 'segments',
    evalUnit: 'evaluations',
    analyzing: 'Analyzing...',
    start: 'Start generation',
    defaultConcept: (i: number) => `Concept ${String.fromCharCode(65 + i)}`,
    defaultSegment: (i: number) => `Segment ${i + 1}`,
  },
}

export function ABTestForm() {
  const router = useRouter()
  const { concepts, segments, model, agentCount, setConcepts, setSegments, setModel, setAgentCount, addPersonas } = useABTestStore()
  const locale = useLocaleStore((s) => s.locale)
  const getLLMConfig = useBYOKStore((s) => s.getRequestConfig)
  const copy = COPY[locale]
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addConcept() {
    setConcepts([{ id: crypto.randomUUID(), name: '', description: '', attributes: [] }, ...concepts])
  }

  function removeConcept(id: string) {
    if (concepts.length <= 1) return
    setConcepts(concepts.filter(c => c.id !== id))
  }

  function updateConcept(id: string, value: string) {
    setConcepts(concepts.map(c => c.id === id ? { ...c, description: value } : c))
  }

  function fillRandomConcept(id: string) {
    const source = locale === 'en' ? RANDOM_CONCEPTS_EN : RANDOM_CONCEPTS
    const pick = source[Math.floor(Math.random() * source.length)]
    const html = marked.parse(pick) as string
    setConcepts(concepts.map(c => c.id === id ? { ...c, description: html } : c))
  }

  function addSegment() {
    setSegments([...segments, { id: crypto.randomUUID(), name: '', description: '' }])
  }

  function removeSegment(id: string) {
    if (segments.length <= 1) return
    setSegments(segments.filter(s => s.id !== id))
  }

  function updateSegment(id: string, value: string) {
    setSegments(segments.map(s => s.id === id ? { ...s, description: value } : s))
  }

  function fillRandomSegment(id: string) {
    const source = locale === 'en' ? RANDOM_SEGMENTS_EN : RANDOM_SEGMENTS
    const pick = source[Math.floor(Math.random() * source.length)]
    setSegments(segments.map(s => s.id === id ? { ...s, description: pick } : s))
  }

  const canStep1 = concepts.some(c => c.description.trim())
  const canStep2 = segments.some(s => s.description.trim())

  async function handleStart() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/abtest/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concepts, segments, model, agentCount, language: locale, llmConfig: getLLMConfig() }),
      })

      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)

      const data = await res.json()

      if (data.concepts) {
        setConcepts(concepts.map((c, i) => ({
          ...c,
          name: data.concepts[i]?.name || copy.defaultConcept(i),
          attributes: data.concepts[i]?.attributes || [],
        })))
      }
      if (data.segments) {
        setSegments(segments.map((s, i) => ({
          ...s,
          name: data.segments[i]?.name || copy.defaultSegment(i),
        })))
      }

      if (data.personas) {
        for (const [segId, agents] of Object.entries(data.personas)) {
          addPersonas(segId, agents as any[])
        }
      }

      router.push('/abtest/config')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Stepper currentStep={step}>
        {/* Step 1: 测试方案 */}
        <Step title={copy.steps.concepts} action={<button type="button" onClick={addConcept} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{copy.addConcept}</button>}>
          <div className="space-y-3">
            {concepts.map((concept, i) => (
              <div key={concept.id} className="rounded-xl bg-muted/50 p-4 space-y-2 relative">
                {concepts.length > 1 && (
                  <button type="button" onClick={() => removeConcept(concept.id)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive text-xs">
                    ×
                  </button>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">{copy.conceptLabel(i)}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => fillRandomConcept(concept.id)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      {copy.randomFill}
                    </button>
                    <label className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {copy.upload}
                      <input type="file" accept=".doc,.docx,.xls,.xlsx,.csv,.txt,.pdf,.md" className="hidden" onChange={() => {}} />
                    </label>
                  </div>
                </div>
                <RichTextEditor
                  value={concept.description}
                  onChange={(val) => updateConcept(concept.id, val)}
                  placeholder={copy.conceptPlaceholder}
                />
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={() => setStep(1)} disabled={!canStep1}>
            {copy.next}
          </Button>
        </Step>

        {/* Step 2: 目标人群 */}
        <Step title={copy.steps.segments} action={<button type="button" onClick={addSegment} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{copy.addSegment}</button>}>
          <div className="space-y-3">
            {segments.map((segment, i) => (
              <div key={segment.id} className="rounded-xl bg-muted/50 p-4 space-y-2 relative">
                {segments.length > 1 && (
                  <button type="button" onClick={() => removeSegment(segment.id)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive text-xs">
                    ×
                  </button>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">{copy.segmentLabel(i)}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => fillRandomSegment(segment.id)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      {copy.randomFill}
                    </button>
                    <label className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {copy.upload}
                      <input type="file" accept=".doc,.docx,.xls,.xlsx,.csv,.txt,.pdf" className="hidden" onChange={() => {}} />
                    </label>
                  </div>
                </div>
                <Textarea
                  value={segment.description}
                  onChange={(e) => updateSegment(segment.id, e.target.value)}
                  placeholder={copy.segmentPlaceholder}
                  rows={3}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
              {copy.previous}
            </Button>
            <Button className="flex-1" onClick={() => setStep(2)} disabled={!canStep2}>
              {copy.next}
            </Button>
          </div>
        </Step>

        {/* Step 3: 测试配置 */}
        <Step title={copy.steps.config}>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{copy.groupSize}</Label>
              <Select value={String(agentCount)} onValueChange={(v) => setAgentCount(Number(v))}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[4, 6, 8, 10, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} {copy.people}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{copy.model}</Label>
              <Select value={model} onValueChange={(v) => v && setModel(v)}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5.4">GPT-5.4</SelectItem>
                  <SelectItem value="gemini">Gemini 3 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{copy.scale}</Label>
              <div className="h-9 flex items-center">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {concepts.length} {copy.conceptUnit} × {segments.length} {copy.segmentUnit} × {agentCount} {copy.people}<br />
                  = <span className="text-foreground font-medium">{concepts.length * segments.length * agentCount}</span> {copy.evalUnit}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
              {copy.previous}
            </Button>
            <Button className="flex-1" onClick={handleStart} disabled={loading}>
              {loading ? copy.analyzing : copy.start}
            </Button>
          </div>
        </Step>
      </Stepper>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-[11px] text-destructive font-mono">{error}</p>
        </div>
      )}
    </div>
  )
}
