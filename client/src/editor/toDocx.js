import {
  AlignmentType, Document, ExternalHyperlink, HeadingLevel, LevelFormat, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx'

// Tiptap JSON -> .docx. Loaded lazily (dynamic import) because the docx library is large.
const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6]
const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED }
const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.slice(1) : undefined)

function runs(nodes = []) {
  return nodes.flatMap((n) => {
    if (n.type === 'hardBreak') return [new TextRun({ break: 1 })]
    const props = { text: n.text || '' }
    let href = null
    for (const m of n.marks || []) {
      if (m.type === 'bold') props.bold = true
      else if (m.type === 'italic') props.italics = true
      else if (m.type === 'underline') props.underline = {}
      else if (m.type === 'strike') props.strike = true
      else if (m.type === 'code') props.font = 'Courier New'
      else if (m.type === 'highlight') props.shading = { fill: hex(m.attrs?.color) || 'FFF475' }
      else if (m.type === 'textStyle') {
        if (hex(m.attrs?.color)) props.color = hex(m.attrs.color)
        if (m.attrs?.fontSize) props.size = Math.round(parseFloat(m.attrs.fontSize) * 1.5) // px -> half-points (96dpi)
        if (m.attrs?.fontFamily) props.font = m.attrs.fontFamily.split(',')[0].replace(/["']/g, '').trim()
      } else if (m.type === 'link') href = m.attrs?.href
    }
    if (href && /^(https?:\/\/|mailto:)/i.test(href)) {
      return [new ExternalHyperlink({ link: href, children: [new TextRun({ ...props, style: 'Hyperlink', color: '1A0DAB', underline: {} })] })]
    }
    return [new TextRun(props)]
  })
}

const plain = (node) => (node.content || []).map((n) => n.text || plain(n)).join('')

function blocks(node, ctx = {}) {
  const align = ALIGN[node.attrs?.textAlign]
  switch (node.type) {
    case 'paragraph':
      return [new Paragraph({ children: runs(node.content), alignment: align, ...ctx.para })]
    case 'heading':
      return [new Paragraph({ children: runs(node.content), heading: HEADINGS[(node.attrs?.level || 1) - 1], alignment: align })]
    case 'blockquote':
      return (node.content || []).flatMap((k) => blocks(k, { para: { indent: { left: 720 } } }))
    case 'codeBlock':
      return plain(node).split('\n').map((line) => new Paragraph({ children: [new TextRun({ text: line, font: 'Courier New' })], shading: { fill: 'F1F3F4' } }))
    case 'horizontalRule':
      return [new Paragraph({ border: { bottom: { style: 'single', size: 6, color: 'BBBBBB', space: 1 } } })]
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
      return (node.content || []).flatMap((li) => {
        const level = ctx.level ?? 0
        return (li.content || []).flatMap((k, i) => {
          if (['bulletList', 'orderedList', 'taskList'].includes(k.type)) return blocks(k, { level: level + 1 })
          if (k.type !== 'paragraph') return blocks(k, ctx)
          const prefix = node.type === 'taskList' && i === 0 ? [new TextRun(li.attrs?.checked ? '☑ ' : '☐ ')] : []
          const base = { children: [...prefix, ...runs(k.content)] }
          if (node.type === 'taskList') return [new Paragraph({ ...base, indent: { left: 360 * (level + 1) } })]
          return [new Paragraph({ ...base, numbering: { reference: node.type === 'bulletList' ? 'bullets' : 'numbers', level: Math.min(level, 4) } })]
        })
      })
    case 'table':
      return [new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: (node.content || []).map((r) => new TableRow({
          children: (r.content || []).map((c) => new TableCell({
            children: (c.content || []).flatMap((k) => blocks(k)).concat(c.content?.length ? [] : [new Paragraph('')]),
          })),
        })),
      }), new Paragraph('')]
    default:
      return [new Paragraph({ children: runs(node.content) })]
  }
}

const levels = (format, text) => Array.from({ length: 5 }, (_, i) => ({ level: i, format, text: text(i), alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } }))

export async function toDocxBlob(doc, title) {
  const document = new Document({
    title,
    numbering: {
      config: [
        { reference: 'bullets', levels: levels(LevelFormat.BULLET, () => '•') },
        { reference: 'numbers', levels: levels(LevelFormat.DECIMAL, (i) => `%${i + 1}.`) },
      ],
    },
    sections: [{ children: (doc.content || []).flatMap((n) => blocks(n)) }],
  })
  return Packer.toBlob(document)
}
