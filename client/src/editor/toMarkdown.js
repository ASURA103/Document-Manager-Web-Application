// Tiptap/ProseMirror JSON -> Markdown. Covers every node/mark the editor can produce.
const esc = (t) => t.replace(/([\\`*_[\]])/g, '\\$1')

function inline(nodes = []) {
  return nodes.map((n) => {
    if (n.type === 'hardBreak') return '  \n'
    let t = esc(n.text || '')
    for (const m of n.marks || []) {
      if (m.type === 'code') t = `\`${n.text}\``
      else if (m.type === 'bold') t = `**${t}**`
      else if (m.type === 'italic') t = `*${t}*`
      else if (m.type === 'strike') t = `~~${t}~~`
      else if (m.type === 'underline') t = `<u>${t}</u>`
      else if (m.type === 'link' && m.attrs?.href) t = `[${t}](${m.attrs.href})`
    }
    return t
  }).join('')
}

const indent = (text, pad) => text.split('\n').map((l, i) => (i === 0 ? l : l ? pad + l : l)).join('\n')

function block(node, ctx = {}) {
  const kids = () => (node.content || [])
  switch (node.type) {
    case 'paragraph': return inline(node.content)
    case 'heading': return `${'#'.repeat(node.attrs?.level || 1)} ${inline(node.content)}`
    case 'blockquote': return kids().map((k) => block(k)).join('\n\n').split('\n').map((l) => `> ${l}`).join('\n')
    case 'codeBlock': return `\`\`\`${node.attrs?.language || ''}\n${(node.content || []).map((n) => n.text).join('')}\n\`\`\``
    case 'horizontalRule': return '---'
    case 'bulletList': return kids().map((li) => `- ${indent(block(li, { list: true }), '  ')}`).join('\n')
    case 'orderedList': return kids().map((li, i) => { const p = `${(node.attrs?.start || 1) + i}. `; return `${p}${indent(block(li, { list: true }), ' '.repeat(p.length))}` }).join('\n')
    case 'taskList': return kids().map((li) => `- [${li.attrs?.checked ? 'x' : ' '}] ${indent(block(li, { list: true }), '  ')}`).join('\n')
    case 'listItem':
    case 'taskItem': return kids().map((k) => block(k, ctx)).join(ctx.list ? '\n' : '\n\n')
    case 'table': {
      const rows = kids().map((r) => (r.content || []).map((c) => (c.content || []).map((p) => block(p)).join(' ').replace(/\|/g, '\\|').replace(/\n/g, ' ')))
      if (!rows.length) return ''
      const w = Math.max(...rows.map((r) => r.length))
      const pad = (r) => `| ${Array.from({ length: w }, (_, i) => r[i] ?? '').join(' | ')} |`
      return [pad(rows[0]), `| ${Array(w).fill('---').join(' | ')} |`, ...rows.slice(1).map(pad)].join('\n')
    }
    default: return inline(node.content)
  }
}

export const toMarkdown = (doc) => `${(doc.content || []).map((n) => block(n)).filter((s) => s !== '').join('\n\n')}\n`
