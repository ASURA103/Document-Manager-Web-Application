import { describe, expect, it } from 'vitest'
import { normalizeApiBase } from './apiBase.js'

describe('normalizeApiBase', () => {
  it('defaults to /api (dev proxy)', () => {
    expect(normalizeApiBase(undefined)).toBe('/api')
    expect(normalizeApiBase('')).toBe('/api')
  })
  it('keeps a value that already ends in /api, ignoring trailing slashes', () => {
    expect(normalizeApiBase('https://x.onrender.com/api')).toBe('https://x.onrender.com/api')
    expect(normalizeApiBase('https://x.onrender.com/api/')).toBe('https://x.onrender.com/api')
  })
  it('adds /api when the host is given without it', () => {
    expect(normalizeApiBase('https://x.onrender.com')).toBe('https://x.onrender.com/api')
    expect(normalizeApiBase('https://x.onrender.com/')).toBe('https://x.onrender.com/api')
  })
})
