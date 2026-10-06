import { describe, expect, it } from 'vitest'
import { trimTrailingEmpty } from './trimTrailing.js'

const p = (text) => (text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' })

describe('trimTrailingEmpty', () => {
  it('removes empty paragraphs at the end only', () => {
    const doc = { type: 'doc', content: [p('a'), p(''), p('b'), p(''), p('')] }
    expect(trimTrailingEmpty(doc).content).toEqual([p('a'), p(''), p('b')])
  })
  it('keeps at least one block', () => {
    expect(trimTrailingEmpty({ type: 'doc', content: [p(''), p('')] }).content).toHaveLength(1)
  })
  it('keeps non-paragraph blocks and does not mutate the input', () => {
    const table = { type: 'table', content: [] }
    const doc = { type: 'doc', content: [table, p('')] }
    expect(trimTrailingEmpty(doc).content).toEqual([table])
    expect(doc.content).toHaveLength(2)
  })
})
