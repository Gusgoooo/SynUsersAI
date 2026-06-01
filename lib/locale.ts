export type Locale = 'zh' | 'en'

export function normalizeLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'zh'
}

export function isEnglish(locale: Locale): boolean {
  return locale === 'en'
}

export function listJoin(items: string[], locale: Locale): string {
  return items.join(locale === 'en' ? ', ' : '、')
}

export function moderatorName(locale: Locale): string {
  return locale === 'en' ? 'Moderator' : '主持人'
}

export function languageInstruction(locale: Locale): string {
  return locale === 'en'
    ? 'Use natural English throughout. Ground the persona, examples, idioms, and conversation norms in an English-speaking context unless the user specified a different region. Do not output Chinese.'
    : '全程使用自然中文。语气、例子、表达习惯都要符合中文语境。不要输出英文。'
}
