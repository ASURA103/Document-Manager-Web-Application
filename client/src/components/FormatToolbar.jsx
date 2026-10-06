import { useEditorState } from '@tiptap/react'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code, Eraser, Highlighter, Italic, Link2,
  List, ListChecks, ListOrdered, Printer, Quote, Redo2, Strikethrough, Underline, Undo2,
} from 'lucide-react'
import { FONT_FAMILIES, FONT_SIZES } from '../editor/extensions.js'
import { printDocument } from '../editor/exportDocument.js'
import Dropdown from './Dropdown.jsx'

const COLORS = ['#000000', '#434343', '#666666', '#999999', '#d93025', '#e8710a', '#f9ab00', '#188038', '#1a73e8', '#9334e6']
const HIGHLIGHTS = ['#fff475', '#fbbc04', '#ccff90', '#a7ffeb', '#cbf0f8', '#d7aefb', '#fdcfe8', '#f6b26b']

const Btn = ({ label, active, disabled, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()} // keep editor focus + selection
    onClick={onClick}
    className={`flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-sm hover:bg-slate-200/80 disabled:opacity-30 ${active ? 'bg-blue-100 text-blue-800' : ''}`}
  >
    {children}
  </button>
)
const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-slate-300" />

function Swatches({ colors, onPick, onReset, resetLabel }) {
  return (
    <div className="p-2">
      <div className="grid grid-cols-5 gap-1.5">
        {colors.map((c) => (
          <button key={c} type="button" aria-label={c} title={c} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(c)} className="h-6 w-6 rounded-full border border-slate-300" style={{ background: c }} />
        ))}
      </div>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onReset} className="mt-2 w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-100">{resetLabel}</button>
    </div>
  )
}

export default function FormatToolbar({ editor, onLink }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const ts = e.getAttributes('textStyle')
      return {
        canUndo: e.can().undo(), canRedo: e.can().redo(),
        style: e.isActive('heading', { level: 1 }) ? 'h1' : e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : 'p',
        font: ts.fontFamily || '', size: ts.fontSize ? parseInt(ts.fontSize, 10) : 16,
        bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
        link: e.isActive('link'), highlight: e.isActive('highlight'), color: ts.color || '#000000',
        left: e.isActive({ textAlign: 'left' }), center: e.isActive({ textAlign: 'center' }),
        right: e.isActive({ textAlign: 'right' }), justify: e.isActive({ textAlign: 'justify' }),
        task: e.isActive('taskList'), bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'),
        quote: e.isActive('blockquote'), code: e.isActive('codeBlock'),
      }
    },
  })
  const c = () => editor.chain().focus()
  // chain().focus() is deferred to the next frame, so after a <select> change the browser focus would still be on
  // the dropdown and typed keys would go to it. Move focus to the editor synchronously first (selection is kept).
  const fromSelect = (apply) => { editor.view.focus(); apply() }

  const setStyle = (v) => {
    if (v === 'p') c().setParagraph().run()
    else c().setHeading({ level: Number(v[1]) }).run()
  }
  const bumpSize = (delta) => {
    const i = FONT_SIZES.findIndex((n) => n >= s.size)
    const next = FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, (i < 0 ? 0 : i) + delta))]
    c().setFontSize(`${next}px`).run()
  }
  const selectCls = 'h-8 rounded border border-transparent bg-transparent px-1 text-sm hover:bg-slate-200/80 focus:border-blue-500 focus:outline-none'

  return (
    <div role="toolbar" aria-label="Formatting" className="no-print mx-3 flex flex-wrap items-center gap-0.5 rounded-full bg-[#edf2fa] px-3 py-1">
      <Btn label="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 size={16} /></Btn>
      <Btn label="Redo (Ctrl+Y)" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 size={16} /></Btn>
      <Btn label="Print (Ctrl+P)" onClick={() => printDocument()}><Printer size={16} /></Btn>
      <Sep />
      <select aria-label="Paragraph style" value={s.style} onChange={(e) => fromSelect(() => setStyle(e.target.value))} className={`${selectCls} w-32`}>
        <option value="p">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <Sep />
      <select aria-label="Font family" value={s.font} onChange={(e) => fromSelect(() => (e.target.value ? c().setFontFamily(e.target.value).run() : c().unsetFontFamily().run()))} className={`${selectCls} w-28`}>
        <option value="">Default</option>
        {FONT_FAMILIES.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>
      <Sep />
      <Btn label="Decrease font size" onClick={() => bumpSize(-1)}>−</Btn>
      <select aria-label="Font size" value={FONT_SIZES.includes(s.size) ? s.size : ''} onChange={(e) => fromSelect(() => c().setFontSize(`${e.target.value}px`).run())} className={`${selectCls} w-16`}>
        {!FONT_SIZES.includes(s.size) && <option value="">{s.size}</option>}
        {FONT_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <Btn label="Increase font size" onClick={() => bumpSize(1)}>+</Btn>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}><Bold size={16} /></Btn>
      <Btn label="Italic (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic size={16} /></Btn>
      <Btn label="Underline (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()}><Underline size={16} /></Btn>
      <Btn label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough size={16} /></Btn>
      <Dropdown label="Text color" buttonClass="flex h-8 min-w-8 flex-col items-center justify-center rounded px-1.5 hover:bg-slate-200/80" trigger={<><span className="text-sm font-semibold leading-none">A</span><span className="mt-0.5 h-1 w-4 rounded" style={{ background: s.color }} /></>}>
        <Swatches colors={COLORS} onPick={(col) => c().setColor(col).run()} onReset={() => c().unsetColor().run()} resetLabel="Reset color" />
      </Dropdown>
      <Dropdown label="Highlight color" buttonClass={`flex h-8 min-w-8 items-center justify-center rounded px-1.5 hover:bg-slate-200/80 ${s.highlight ? 'bg-blue-100' : ''}`} trigger={<Highlighter size={16} />}>
        <Swatches colors={HIGHLIGHTS} onPick={(col) => c().setHighlight({ color: col }).run()} onReset={() => c().unsetHighlight().run()} resetLabel="No highlight" />
      </Dropdown>
      <Btn label="Insert link (Ctrl+K)" active={s.link} onClick={onLink}><Link2 size={16} /></Btn>
      <Sep />
      <Btn label="Align left" active={s.left} onClick={() => c().setTextAlign('left').run()}><AlignLeft size={16} /></Btn>
      <Btn label="Align center" active={s.center} onClick={() => c().setTextAlign('center').run()}><AlignCenter size={16} /></Btn>
      <Btn label="Align right" active={s.right} onClick={() => c().setTextAlign('right').run()}><AlignRight size={16} /></Btn>
      <Btn label="Justify" active={s.justify} onClick={() => c().setTextAlign('justify').run()}><AlignJustify size={16} /></Btn>
      <Sep />
      <Btn label="Checklist" active={s.task} onClick={() => c().toggleTaskList().run()}><ListChecks size={16} /></Btn>
      <Btn label="Bulleted list" active={s.bullet} onClick={() => c().toggleBulletList().run()}><List size={16} /></Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
      <Btn label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote size={16} /></Btn>
      <Btn label="Code block" active={s.code} onClick={() => c().toggleCodeBlock().run()}><Code size={16} /></Btn>
      <Sep />
      <Btn label="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}><Eraser size={16} /></Btn>
    </div>
  )
}
