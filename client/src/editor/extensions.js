import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'

// StarterKit (v3) already provides headings, bold/italic/underline/strike, lists, link, blockquote, code, hr, undo/redo.
export const extensions = [
  StarterKit.configure({ link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } } }),
  TextStyleKit, // color, font family, font size
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({ placeholder: 'Start typing…' }),
]

export const FONT_FAMILIES = [
  { label: 'Sans serif', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Monospace', value: 'ui-monospace, "SF Mono", Menlo, monospace' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
]
export const FONT_SIZES = [10, 11, 12, 14, 16, 18, 24, 30, 36]
