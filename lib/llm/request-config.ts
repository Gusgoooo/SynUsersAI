import { normalizeProviderConfig, type LLMProviderConfigInput } from './provider-config'

export function parseRequestProviderConfig(value: unknown) {
  if (!value) return undefined
  if (typeof value === 'string') {
    try {
      return normalizeProviderConfig(JSON.parse(value) as LLMProviderConfigInput)
    } catch {
      return undefined
    }
  }
  return normalizeProviderConfig(value as LLMProviderConfigInput)
}
