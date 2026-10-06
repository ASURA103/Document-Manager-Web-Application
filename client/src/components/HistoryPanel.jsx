import { useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { errorMessage, useGetVersionQuery, useGetVersionsQuery } from '../features/api.js'
import { extensions } from '../editor/extensions.js'

const when = (d) => new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// Read-only rendering of an old version, using the same schema as the editor.
function Preview({ content }) {
  const editor = useEditor({ extensions, content, editable: false })
  return <div className="max-h-64 overflow-auto rounded border border-slate-200 bg-white px-3 py-2 text-sm"><EditorContent editor={editor} /></div>
}

export default function HistoryPanel({ documentId, canRestore, onRestore }) {
  const { data, isLoading, error } = useGetVersionsQuery(documentId)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { ok, text }
  const preview = useGetVersionQuery({ id: documentId, versionId: selected }, { skip: !selected })

  const restore = async () => {
    setBusy(true); setMessage(null)
    const result = await onRestore(selected)
    setBusy(false)
    setMessage(result.ok ? { ok: true, text: 'Version restored. The previous content was kept in the history.' } : { ok: false, text: result.message })
  }

  return (
    <div className="p-3">
      <p className="text-xs text-slate-600">Earlier versions are saved automatically as the document changes (at most one every 5 minutes, newest 30 kept).</p>
      {isLoading && <p className="mt-3 text-sm text-slate-600">Loading history…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{errorMessage(error, 'Unable to load history.')}</p>}
      {data && data.length === 0 && <p className="mt-6 text-center text-sm text-slate-600">No earlier versions yet. They appear after the document has been edited and saved.</p>}
      {data && data.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label="Versions">
          {data.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => { setSelected(v.id); setMessage(null) }}
                aria-pressed={selected === v.id}
                className={`w-full rounded border px-3 py-2 text-left text-sm ${selected === v.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="block font-medium">{when(v.createdAt)}</span>
                <span className="block text-xs text-slate-600">{v.author ? `Edited by ${v.author.name}` : 'Unknown author'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="mt-4">
          <h3 className="text-sm font-medium">Preview</h3>
          {preview.isFetching && <p className="mt-1 text-xs text-slate-600">Loading…</p>}
          {preview.error && <p role="alert" className="mt-1 text-sm text-red-700">{errorMessage(preview.error, 'Unable to load this version.')}</p>}
          {preview.data && !preview.isFetching && <div className="mt-1"><Preview key={selected} content={preview.data.content} /></div>}
          {canRestore ? (
            <button onClick={restore} disabled={busy || !preview.data} className="mt-3 w-full rounded-full bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              {busy ? 'Restoring…' : 'Restore this version'}
            </button>
          ) : (
            <p className="mt-3 text-xs text-slate-600">You have view-only access, so you cannot restore versions.</p>
          )}
        </div>
      )}
      {message && <p role={message.ok ? 'status' : 'alert'} className={`mt-3 text-sm ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>}
    </div>
  )
}
