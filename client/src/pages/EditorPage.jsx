import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { FileText, History, Users } from 'lucide-react'
import {
  errorMessage, useCreateDocumentMutation, useDeleteDocumentMutation, useGetDocumentQuery, useRestoreVersionMutation, useUpdateDocumentMutation,
} from '../features/api.js'
import { extensions } from '../editor/extensions.js'
import { trimTrailingEmpty } from '../editor/trimTrailing.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { exportDocx, exportHtml, exportMd, exportTxt, printDocument } from '../editor/exportDocument.js'
import FormatToolbar from '../components/FormatToolbar.jsx'
import MenuBar from '../components/MenuBar.jsx'
import ShareDialog from '../components/ShareDialog.jsx'
import LinkDialog from '../components/LinkDialog.jsx'
import InfoDialog from '../components/InfoDialog.jsx'
import UserMenu from '../components/UserMenu.jsx'
import SidePanel from '../components/SidePanel.jsx'
import HistoryPanel from '../components/HistoryPanel.jsx'
import LeaveDialog from '../components/LeaveDialog.jsx'
import DownloadDialog from '../components/DownloadDialog.jsx'

const AUTOSAVE_MS = 1500

// Each state has a dot AND text, so state is never conveyed by colour alone.
const STATUS = {
  saved: { text: 'All changes saved', cls: 'text-slate-700', dot: 'bg-emerald-600' },
  dirty: { text: 'Unsaved changes…', cls: 'text-amber-800', dot: 'bg-amber-600' },
  saving: { text: 'Saving…', cls: 'text-slate-700', dot: 'bg-slate-500 animate-pulse' },
  error: { text: 'Save failed — click to retry', cls: 'text-red-700', dot: 'bg-red-600' },
}

const SHORTCUTS = [
  ['Bold', 'B'], ['Italic', 'I'], ['Underline', 'U'], ['Insert link', 'K'], ['Undo', 'Z'], ['Redo', 'Y'], ['Save now', 'S'], ['Print', 'P'],
]

function DocumentEditor({ doc }) {
  const navigate = useNavigate()
  const canWrite = doc.role === 'owner' || doc.role === 'editor'
  const isOwner = doc.role === 'owner'
  const mod = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'

  const [updateDocument] = useUpdateDocumentMutation()
  const [createDocument] = useCreateDocumentMutation()
  const [deleteDocument] = useDeleteDocumentMutation()
  const [restoreVersion] = useRestoreVersionMutation()
  const [panel, setPanel] = useState(null) // null | 'history'

  const [status, setStatusState] = useState('saved')
  const [saveError, setSaveError] = useState(null)
  const [title, setTitle] = useState(doc.title)
  const [titleError, setTitleError] = useState(null)
  const [viewMode, setViewMode] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [showCount, setShowCount] = useState(true)
  // Autosave preference is per browser and remembered; defaults to on.
  const [autosave, setAutosave] = useState(() => { try { return localStorage.getItem('docs.autosave') !== 'off' } catch { return true } })
  const autosaveRef = useRef(autosave)
  const [dialog, setDialog] = useState(null) // 'share' | 'link' | 'count' | 'shortcuts'

  const version = useRef(0) // bumped on each edit so a finished save can tell if more edits arrived
  const saving = useRef(false)
  const timer = useRef(null)
  const titleRef = useRef(null)
  const saveRef = useRef(() => {})
  const statusRef = useRef('saved')
  // Keep a ref in step with the state so async callbacks (leave checks) never read a stale value.
  const setStatus = useCallback((value) => { statusRef.current = value; setStatusState(value) }, [])
  const [leavePrompt, setLeavePrompt] = useState(null) // { resolve } while the Save changes? modal is open

  const editor = useEditor({
    extensions,
    content: doc.content,
    editable: canWrite,
    onUpdate: () => {
      version.current += 1
      setStatus('dirty')
      clearTimeout(timer.current)
      if (autosaveRef.current) timer.current = setTimeout(() => saveRef.current(), AUTOSAVE_MS) // autosave after a pause in typing
    },
  })

  // Only touch editability when it actually changes: calling setEditable on mount emits an
  // "update" event, which would mark an untouched document dirty and autosave it just for opening it.
  useEffect(() => {
    const editable = canWrite && !viewMode
    if (editor && editor.isEditable !== editable) editor.setEditable(editable, false)
  }, [editor, canWrite, viewMode])

  const save = useCallback(async () => {
    if (!editor || !canWrite) return true
    clearTimeout(timer.current)
    if (saving.current) return false // a save is in flight; the finishing save re-schedules if edits arrived
    saving.current = true
    const savedVersion = version.current
    setStatus('saving'); setSaveError(null)
    const res = await updateDocument({ id: doc.id, content: trimTrailingEmpty(editor.getJSON()) })
    saving.current = false
    if (res.error) {
      setStatus('error'); setSaveError(errorMessage(res.error, 'Unable to save document.'))
      return false
    } else if (version.current === savedVersion) {
      setStatus('saved') // "saved" only after the server confirmed and nothing changed meanwhile
    } else {
      setStatus('dirty')
      if (autosaveRef.current) timer.current = setTimeout(() => saveRef.current(), AUTOSAVE_MS)
    }
    return true
  }, [editor, canWrite, updateDocument, doc.id, setStatus])
  useEffect(() => { saveRef.current = save }, [save])
  useEffect(() => () => clearTimeout(timer.current), [])

  const commitTitle = async () => {
    const next = title.trim()
    if (next === doc.title) return setTitleError(null)
    if (!next) { setTitle(doc.title); return setTitleError('Title cannot be empty.') }
    const res = await updateDocument({ id: doc.id, title: next })
    if (res.error) { setTitle(doc.title); return setTitleError(errorMessage(res.error, 'Unable to rename document.')) }
    setTitle(res.data.title); setTitleError(null)
  }

  const openLink = useCallback(() => { if (canWrite && !viewMode) setDialog('link') }, [canWrite, viewMode])

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const k = e.key.toLowerCase()
      if (k === 's') { e.preventDefault(); save() }
      else if (k === 'k') { e.preventDefault(); openLink() }
    }
    const onUnload = (e) => { if (status === 'dirty' || status === 'error') e.preventDefault() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('beforeunload', onUnload)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onUnload) }
  }, [save, openLink, status])

  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const text = e.getText({ blockSeparator: ' ' }).trim()
      return { words: text ? text.split(/\s+/).length : 0, chars: text.length }
    },
  }) ?? { words: 0, chars: 0 }

  const toggleAutosave = useCallback(() => {
    const next = !autosaveRef.current
    autosaveRef.current = next
    setAutosave(next)
    try { localStorage.setItem('docs.autosave', next ? 'on' : 'off') } catch { /* preference is optional */ }
    clearTimeout(timer.current)
    if (next && version.current > 0 && statusRef.current !== 'saved') saveRef.current() // turning it on flushes pending edits
  }, [])

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // Leaving with unsaved edits opens a Save / Don't save / Cancel modal. Resolves true if it is OK to leave.
  const canLeave = useCallback(async () => {
    if (!canWrite) return true
    for (let i = 0; i < 50 && saving.current; i += 1) await sleep(100) // let an in-flight save finish first
    if (statusRef.current === 'saved') return true
    return new Promise((resolve) => setLeavePrompt({ resolve }))
  }, [canWrite])

  const saveForLeave = async () => {
    for (let i = 0; i < 50 && saving.current; i += 1) await sleep(100)
    if (statusRef.current === 'saved') return true
    return saveRef.current()
  }
  const decideLeave = (decision) => {
    if (decision === 'discard') clearTimeout(timer.current) // nothing more should be sent for this document
    leavePrompt?.resolve(decision !== 'cancel')
    setLeavePrompt(null)
  }

  const actions = useMemo(() => ({
    newDocument: async () => {
      if (!(await canLeave())) return
      const res = await createDocument()
      if (!res.error) navigate(`/documents/${res.data.id}`)
    },
    goHome: async () => { if (await canLeave()) navigate('/') },
    save: () => save(),
    toggleAutosave,
    share: () => setDialog('share'),
    rename: () => titleRef.current?.focus(),
    download: () => setDialog('download'),
    history: () => setPanel('history'),
    print: printDocument,
    remove: async () => {
      if (!window.confirm(`Delete "${doc.title}" permanently? Shared access will be removed too.`)) return
      clearTimeout(timer.current)
      const res = await deleteDocument(doc.id)
      if (res.error) return setSaveError(errorMessage(res.error, 'Unable to delete document.'))
      navigate('/')
    },
    setViewMode, setZoom,
    toggleCount: () => setShowCount((v) => !v),
    link: openLink,
    wordCount: () => setDialog('count'),
    shortcuts: () => setDialog('shortcuts'),
  }), [save, canLeave, toggleAutosave, createDocument, deleteDocument, navigate, doc.id, doc.title, openLink])

  const doDownload = async (format, name) => {
    if (format === 'docx') return exportDocx(editor, name)
    if (format === 'md') return exportMd(editor, name)
    if (format === 'txt') return exportTxt(editor, name)
    if (format === 'html') return exportHtml(editor, name)
    // pdf: close the modal first so it is not part of the printed page
    setDialog(null)
    await sleep(150)
    return printDocument(name)
  }

  // Restoring replaces the document content on the server. Unsaved edits are saved first so they are
  // kept in the history instead of being silently overwritten.
  const restoreFromHistory = async (versionId) => {
    if (statusRef.current === 'dirty' || statusRef.current === 'error') {
      const saved = await saveRef.current()
      if (!saved) return { ok: false, message: 'Your current changes could not be saved, so nothing was restored.' }
    }
    const res = await restoreVersion({ id: doc.id, versionId })
    if (res.error) return { ok: false, message: errorMessage(res.error, 'Unable to restore this version.') }
    clearTimeout(timer.current)
    editor.commands.setContent(res.data.content, { emitUpdate: false }) // no update event: it must not look like an unsaved edit
    setStatus('saved')
    return { ok: true }
  }

  const applyLink = (url) => { editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); setDialog(null) }
  const removeLink = () => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setDialog(null) }

  const s = STATUS[status]
  const readOnly = !canWrite || viewMode

  return (
    <div className="flex min-h-screen flex-col bg-[#f9fbfd]">
      <header className="no-print sticky top-0 z-20 bg-[#f9fbfd]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-2">
          <Link to="/" aria-label="All documents" onClick={async (e) => { e.preventDefault(); if (await canLeave()) navigate('/') }} className="text-blue-600"><FileText size={32} strokeWidth={1.5} /></Link>
          <div className="min-w-[10rem] flex-1">
            {isOwner ? (
              <input
                ref={titleRef}
                value={title}
                maxLength={120}
                aria-label="Document title"
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full max-w-md truncate rounded border border-transparent px-1.5 text-lg hover:border-slate-400 focus:border-blue-600 focus:outline-none"
              />
            ) : (
              <h1 title="Only the owner can rename this document" className="max-w-md cursor-default truncate px-1.5 text-lg">{doc.title}</h1>
            )}
            {titleError && <p role="alert" className="px-1.5 text-xs text-red-600">{titleError}</p>}
          </div>
          {canWrite ? (
            <>
              <button onClick={save} disabled={status === 'saving'} role="status" aria-live="polite" className={`flex items-center gap-1.5 text-sm ${s.cls} hover:underline disabled:no-underline`}>
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.dot}`} />{s.text}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={autosave}
                aria-label="Autosave"
                onClick={toggleAutosave}
                className="flex items-center gap-1.5 rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                <span aria-hidden="true" className={`relative inline-block h-3.5 w-6 rounded-full ${autosave ? 'bg-blue-600' : 'bg-slate-400'}`}>
                  <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ${autosave ? 'left-3' : 'left-0.5'}`} />
                </span>
                Autosave {autosave ? 'on' : 'off'}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={status === 'saving' || status === 'saved' || viewMode}
                title="Save (Ctrl/Cmd+S)"
                className="rounded-full bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-600"
              >
                Save
              </button>
            </>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">View only</span>
          )}
          <span className="hidden text-xs text-slate-600 sm:inline">{doc.role === 'owner' ? 'Owner' : `Owner: ${doc.owner?.name} · ${doc.role}`}</span>
          <button
            onClick={() => setDialog('share')}
            disabled={!isOwner}
            title={isOwner ? 'Share' : 'Only the owner can share'}
            className="flex items-center gap-2 rounded-full bg-[#c2e7ff] px-5 py-2 text-sm font-medium text-[#001d35] hover:shadow disabled:opacity-50"
          >
            <Users size={16} /> Share
          </button>
          <button
            type="button"
            aria-label="Version history"
            aria-pressed={panel === 'history'}
            title="Version history"
            onClick={() => setPanel((p) => (p === 'history' ? null : 'history'))}
            className={`rounded-full p-2 text-slate-700 hover:bg-slate-200 ${panel === 'history' ? 'bg-blue-100' : ''}`}
          >
            <History size={18} />
          </button>
          <UserMenu beforeSignOut={canLeave} />
        </div>
        <MenuBar editor={editor} autosave={autosave} canWrite={canWrite} isOwner={isOwner} viewMode={viewMode} zoom={zoom} showCount={showCount} actions={actions} />
        {!readOnly && editor && <div className="py-1"><FormatToolbar editor={editor} onLink={openLink} /></div>}
        {saveError && <p role="alert" className="px-4 py-1 text-sm text-red-600">{saveError}</p>}
      </header>

      <div className="flex min-h-0 flex-1">
      <main className="min-w-0 flex-1 overflow-auto bg-[#f9fbfd] px-2 py-4 print:p-0">
        <div className="page mx-auto w-full min-h-[1056px] max-w-[816px] bg-white px-6 py-10 shadow-[0_0_0_1px_#dadce0] sm:px-[72px]" style={{ zoom: zoom / 100 }}>
          <EditorContent editor={editor} />
        </div>
      </main>
      {panel && (
        <SidePanel tabs={[{ id: 'history', label: 'History' }]} active={panel} onTab={setPanel} onClose={() => setPanel(null)}>
          {panel === 'history' && <HistoryPanel documentId={doc.id} canRestore={canWrite && !viewMode} onRestore={restoreFromHistory} />}
        </SidePanel>
      )}
      </div>

      {showCount && (
        <footer className="no-print border-t border-slate-200 bg-white px-4 py-1 text-xs text-slate-600">
          {counts.words} words · {counts.chars} characters · Your access: <span className="font-medium">{doc.role}</span>{viewMode && ' · Viewing mode'}
        </footer>
      )}

      {leavePrompt && <LeaveDialog title={doc.title} onSave={saveForLeave} onDecision={decideLeave} />}
      {dialog === 'download' && <DownloadDialog defaultName={doc.title} onDownload={doDownload} onClose={() => setDialog(null)} />}
      {dialog === 'share' && <ShareDialog documentId={doc.id} onClose={() => setDialog(null)} />}
      {dialog === 'link' && (
        <LinkDialog initial={editor.getAttributes('link').href || ''} onApply={applyLink} onRemove={removeLink} onClose={() => setDialog(null)} />
      )}
      {dialog === 'count' && (
        <InfoDialog title="Word count" onClose={() => setDialog(null)}>
          <p>Words: <b>{counts.words}</b></p>
          <p>Characters: <b>{counts.chars}</b></p>
        </InfoDialog>
      )}
      {dialog === 'shortcuts' && (
        <InfoDialog title="Keyboard shortcuts" onClose={() => setDialog(null)}>
          <ul className="space-y-1">{SHORTCUTS.map(([n, k]) => <li key={n} className="flex justify-between"><span>{n}</span><kbd className="rounded bg-slate-100 px-1.5">{mod}{k}</kbd></li>)}</ul>
        </InfoDialog>
      )}
    </div>
  )
}

export default function EditorPage() {
  const { id } = useParams()
  const { data, isLoading, error, refetch } = useGetDocumentQuery(id)
  useDocumentTitle(data ? `${data.title} – Docs` : error ? 'Document not found – Docs' : 'Docs')

  if (isLoading) return <p className="p-6 text-sm text-slate-600">Loading document…</p>
  if (error) {
    const notFound = error.status === 404 || error.status === 400
    return (
      <div role="alert" className="m-6 max-w-lg rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{notFound ? 'Document not found, or you do not have access to it.' : errorMessage(error, 'Unable to load document.')}</p>
        <div className="mt-2 flex gap-3">
          {!notFound && <button onClick={refetch} className="underline">Retry</button>}
          <Link to="/" className="underline">Back to documents</Link>
        </div>
      </div>
    )
  }
  // key: a different document id always gets a fresh editor instance.
  return <DocumentEditor key={data.id} doc={data} />
}
