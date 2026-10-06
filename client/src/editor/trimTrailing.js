const isEmptyParagraph = (node) => node.type === 'paragraph' && !(node.content && node.content.length)

// Drops empty paragraphs from the end of a Tiptap doc (keeping at least one block).
// The editor adds its own trailing paragraph on load, so users see no difference.
export function trimTrailingEmpty(doc) {
  const content = [...(doc.content || [])]
  while (content.length > 1 && isEmptyParagraph(content[content.length - 1])) content.pop()
  return { ...doc, content }
}
