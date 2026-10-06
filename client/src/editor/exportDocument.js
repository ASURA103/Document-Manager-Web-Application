// Client-side export of the current editor content. No server round trip, no extra dependencies.
// Replace path separators, reserved filename characters and control characters.
const safeName = (title) =>
  [...(title || 'Untitled')].map((ch) => (ch.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(ch) ? '_' : ch)).join('').trim().slice(0, 100) || 'Untitled'

function download(filename, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const exportTxt = (editor, title) =>
  download(`${safeName(title)}.txt`, editor.getText({ blockSeparator: '\n\n' }), 'text/plain;charset=utf-8')

export const exportHtml = (editor, title) =>
  download(
    `${safeName(title)}.html`,
    `<!doctype html><html><head><meta charset="utf-8"><title>${safeName(title)}</title></head><body>${editor.getHTML()}</body></html>`,
    'text/html;charset=utf-8',
  )

export const exportMd = async (editor, title) => {
  const { toMarkdown } = await import('./toMarkdown.js')
  download(`${safeName(title)}.md`, toMarkdown(editor.getJSON()), 'text/markdown;charset=utf-8')
}

// docx library is large, so it is only loaded when the user actually exports.
export const exportDocx = async (editor, title) => {
  const { toDocxBlob } = await import('./toDocx.js')
  download(`${safeName(title)}.docx`, await toDocxBlob(editor.getJSON(), title), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}

// "Save as PDF" goes through the browser's print dialog (print CSS hides the app chrome).
// Browsers use the page title as the default PDF file name, so it is set to the chosen name while printing.
export const printDocument = (name) => {
  const previous = document.title
  document.title = (typeof name === 'string' && name.trim()) || previous.replace(/ \u2013 Docs$/, '')
  const restore = () => { document.title = previous; window.removeEventListener('afterprint', restore) }
  window.addEventListener('afterprint', restore)
  window.print()
}
