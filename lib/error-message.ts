export type ErrorMessageLocale = 'zh' | 'en'

export function getRawErrorMessage(err: unknown): string {
  if (err instanceof Error) return `${err.name ? `${err.name}: ` : ''}${err.message}`
  return String(err)
}

export function isAbortLikeError(err: unknown): boolean {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name?: unknown }).name) : ''
  const raw = getRawErrorMessage(err)
  return name === 'AbortError' || /AbortError|operation was aborted|This operation was aborted|aborted/i.test(raw)
}

export function getModelInterruptedMessage(locale: ErrorMessageLocale = 'zh'): string {
  return locale === 'en'
    ? 'The model request was interrupted or timed out. Please try again, or reduce the uploaded material and persona count.'
    : '模型请求被中断或超时了。请重试一次，或减少上传材料/人设数量后再生成。'
}

export function getPublicErrorMessage(err: unknown, locale: ErrorMessageLocale = 'zh'): string {
  if (isAbortLikeError(err)) return getModelInterruptedMessage(locale)
  return getRawErrorMessage(err).replace(/^Error:\s*/, '')
}
