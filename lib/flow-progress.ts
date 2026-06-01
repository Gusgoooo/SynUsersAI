import type { Locale } from '@/lib/locale'

export type GenerationFlowKind = 'generated' | 'imported'

export interface FlowStep {
  id: string
  title: string
  detail: string
  estimatedAt: number
}

export interface FlowProgressEvent {
  step: string
  label: string
  detail?: string
  timestamp: number
}

const GENERATION_FLOW_STEPS: Record<Locale, Record<GenerationFlowKind, FlowStep[]>> = {
  zh: {
    generated: [
      {
        id: 'validate-input',
        title: '检查话题、人群与模型配置',
        detail: '确认话题、人群描述、BYOK 或 .env 模型配置可以用于本次生成。',
        estimatedAt: 0,
      },
      {
        id: 'compose-persona-prompt',
        title: '组装人设生成指令',
        detail: '把人群描述、语言环境、输出结构和聊天执行契约写入 prompt。',
        estimatedAt: 2,
      },
      {
        id: 'generate-personas',
        title: '大模型生成基础人设画像',
        detail: '生成背景、立场、性格、说话风格、OCEAN 与偏差参数。',
        estimatedAt: 5,
      },
      {
        id: 'normalize-personas',
        title: '校验并补齐人设字段',
        detail: '标准化数值、去掉异常空值，并补齐运行时需要的情绪和能量状态。',
        estimatedAt: 20,
      },
      {
        id: 'prepare-topic-relation',
        title: '解析人设与话题的交叉关系',
        detail: '生成熟悉度、相关度、可能误解、判断角度和该话题下会显露的特点。',
        estimatedAt: 24,
      },
      {
        id: 'finalize-preview',
        title: '写入 AI 人设预览',
        detail: '准备摘要卡片与展开详情，让画像、记忆和话题关系可检查。',
        estimatedAt: 38,
      },
    ],
    imported: [
      {
        id: 'validate-upload',
        title: '检查上传文件',
        detail: '确认 CSV、Excel、Word 或文本文件数量、大小与模型配置。',
        estimatedAt: 0,
      },
      {
        id: 'parse-files',
        title: '解析文件并切分来源锚点',
        detail: '读取表格、文档和文本，把原始材料拆成可追溯的证据单元。',
        estimatedAt: 3,
      },
      {
        id: 'rank-evidence',
        title: '筛选与话题最相关的材料',
        detail: '用语义相似度和来源均衡策略选择最能支撑人设蒸馏的材料。',
        estimatedAt: 8,
      },
      {
        id: 'distill-memory-personas',
        title: '大模型蒸馏人类式记忆系统',
        detail: '从来源材料中提炼语义记忆、复合经历、消费习惯、认知方式和语言风格。',
        estimatedAt: 16,
      },
      {
        id: 'prepare-topic-relation',
        title: '解析人设与话题的交叉关系',
        detail: '生成熟悉度、相关度、可能误解、判断角度和该话题下会显露的特点。',
        estimatedAt: 35,
      },
      {
        id: 'finalize-preview',
        title: '写入 AI 人设预览',
        detail: '保留来源支撑和记忆激活线索，准备摘要卡片与展开详情。',
        estimatedAt: 48,
      },
    ],
  },
  en: {
    generated: [
      {
        id: 'validate-input',
        title: 'Checking topic, audience, and model config',
        detail: 'Verifying the topic, audience description, and BYOK or .env model settings.',
        estimatedAt: 0,
      },
      {
        id: 'compose-persona-prompt',
        title: 'Composing the persona prompt',
        detail: 'Packing the audience, language context, output schema, and chat contract into the prompt.',
        estimatedAt: 2,
      },
      {
        id: 'generate-personas',
        title: 'LLM is generating base persona profiles',
        detail: 'Creating backgrounds, stances, personality, speaking style, OCEAN, and bias parameters.',
        estimatedAt: 5,
      },
      {
        id: 'normalize-personas',
        title: 'Validating and completing persona fields',
        detail: 'Normalizing scores, removing invalid blanks, and adding runtime emotion and energy state.',
        estimatedAt: 20,
      },
      {
        id: 'prepare-topic-relation',
        title: 'Mapping persona-topic relationships',
        detail: 'Generating familiarity, relevance, possible misunderstandings, decision angles, and visible traits.',
        estimatedAt: 24,
      },
      {
        id: 'finalize-preview',
        title: 'Preparing the AI persona preview',
        detail: 'Preparing summary cards and expanded details so profiles, memory, and topic fit are inspectable.',
        estimatedAt: 38,
      },
    ],
    imported: [
      {
        id: 'validate-upload',
        title: 'Checking uploaded files',
        detail: 'Verifying CSV, Excel, Word, or text files plus the active model settings.',
        estimatedAt: 0,
      },
      {
        id: 'parse-files',
        title: 'Parsing files into source anchors',
        detail: 'Reading spreadsheets, documents, and text, then splitting raw material into traceable evidence units.',
        estimatedAt: 3,
      },
      {
        id: 'rank-evidence',
        title: 'Selecting topic-relevant material',
        detail: 'Using semantic similarity and source balancing to choose material for persona distillation.',
        estimatedAt: 8,
      },
      {
        id: 'distill-memory-personas',
        title: 'LLM is distilling human-like memory systems',
        detail: 'Extracting semantic memory, composite experiences, consumption habits, cognitive style, and language register.',
        estimatedAt: 16,
      },
      {
        id: 'prepare-topic-relation',
        title: 'Mapping persona-topic relationships',
        detail: 'Generating familiarity, relevance, possible misunderstandings, decision angles, and visible traits.',
        estimatedAt: 35,
      },
      {
        id: 'finalize-preview',
        title: 'Preparing the AI persona preview',
        detail: 'Keeping source support and memory activation cues available for summary cards and expanded details.',
        estimatedAt: 48,
      },
    ],
  },
}

export function getGenerationFlowSteps(locale: Locale, kind: GenerationFlowKind): FlowStep[] {
  return GENERATION_FLOW_STEPS[locale]?.[kind] || GENERATION_FLOW_STEPS.zh[kind]
}

export function buildFlowProgress(
  locale: Locale,
  kind: GenerationFlowKind,
  step: string,
  detail?: string
): FlowProgressEvent {
  const match = getGenerationFlowSteps(locale, kind).find((item) => item.id === step)
  return {
    step,
    label: match?.title || step,
    detail: detail || match?.detail,
    timestamp: Date.now(),
  }
}
