'use client'

import { create } from 'zustand'
import {
  DEFAULT_BYOK_CONFIG,
  getProviderPreset,
  type LLMProviderConfig,
  type LLMProviderPresetId,
  type LLMProtocol,
} from '@/lib/llm/provider-config'

const STORAGE_KEY = 'synusersai.byok.session'

interface BYOKState {
  hydrated: boolean
  config: LLMProviderConfig
  hydrate: () => void
  setEnabled: (enabled: boolean) => void
  setConfig: (updates: Partial<LLMProviderConfig>) => void
  setProtocol: (protocol: LLMProtocol) => void
  applyPreset: (presetId: LLMProviderPresetId) => void
  clear: () => void
  getRequestConfig: () => LLMProviderConfig | undefined
}

function readSessionConfig(): LLMProviderConfig {
  if (typeof window === 'undefined') return DEFAULT_BYOK_CONFIG
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BYOK_CONFIG
    return { ...DEFAULT_BYOK_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_BYOK_CONFIG
  }
}

function writeSessionConfig(config: LLMProviderConfig) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export const useBYOKStore = create<BYOKState>((set, get) => ({
  hydrated: false,
  config: DEFAULT_BYOK_CONFIG,
  hydrate: () => {
    if (get().hydrated) return
    set({ hydrated: true, config: readSessionConfig() })
  },
  setEnabled: (enabled) => {
    const config = { ...get().config, enabled }
    writeSessionConfig(config)
    set({ config })
  },
  setConfig: (updates) => {
    const config = { ...get().config, ...updates }
    writeSessionConfig(config)
    set({ config })
  },
  setProtocol: (protocol) => {
    const current = get().config
    const config = {
      ...current,
      protocol,
      baseUrl: protocol === 'gemini'
        ? 'https://generativelanguage.googleapis.com/v1beta'
        : 'https://api.openai.com/v1/chat/completions',
      model: protocol === 'gemini' ? 'gemini-1.5-pro' : current.model || 'gpt-4o-mini',
    }
    writeSessionConfig(config)
    set({ config })
  },
  applyPreset: (presetId) => {
    const preset = getProviderPreset(presetId)
    const config = {
      ...get().config,
      protocol: preset.protocol,
      baseUrl: preset.baseUrl,
      model: preset.model,
    }
    writeSessionConfig(config)
    set({ config })
  },
  clear: () => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY)
    set({ config: DEFAULT_BYOK_CONFIG })
  },
  getRequestConfig: () => {
    const { config } = get()
    if (!config.apiKey.trim() || !config.model.trim() || !config.baseUrl.trim()) return undefined
    return { ...config, enabled: true }
  },
}))
