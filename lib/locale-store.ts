'use client'

import { create } from 'zustand'
import type { Locale } from '@/lib/locale'
import { normalizeLocale } from '@/lib/locale'

const STORAGE_KEY = 'synusersai.locale'

interface LocaleState {
  locale: Locale
  hydrated: boolean
  hydrate: () => void
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

function applyLocale(locale: Locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh'
  }
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: 'zh',
  hydrated: false,
  hydrate: () => {
    if (typeof window === 'undefined') return
    const stored = normalizeLocale(window.localStorage.getItem(STORAGE_KEY))
    applyLocale(stored)
    set({ locale: stored, hydrated: true })
  },
  setLocale: (locale) => {
    applyLocale(locale)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale)
    }
    set({ locale, hydrated: true })
  },
  toggleLocale: () => {
    const next: Locale = get().locale === 'zh' ? 'en' : 'zh'
    get().setLocale(next)
  },
}))
