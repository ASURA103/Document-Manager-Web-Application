import { useState } from 'react'
import useEscapeKey from '../hooks/useEscapeKey.js'

// Desktop-style "Save changes?" prompt shown when leaving a document with unsaved edits.
// onSave resolves true when the save succeeded (the dialog then closes via onDecision).
export default function LeaveDialog({ title, onSave, onDecision }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEscapeKey(() => { if (!busy) onDecision('cancel') })

  const save = async () => {
    setBusy(true); setError(null)
    const ok = await onSave()
    setBusy(false)
    if (ok) onDecision('save')
    else setError('Could not save. Check your connection and try again, or choose Don’t save.')
  }

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-desc" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="leave-title" className="text-lg font-medium">Save changes?</h2>
        <p id="leave-desc" className="mt-2 text-sm text-slate-700">
          You have unsaved changes in <b className="break-words">{title}</b>. If you don&rsquo;t save, they will be lost.
        </p>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => onDecision('cancel')} className="rounded-full px-4 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={busy} onClick={() => onDecision('discard')} className="rounded-full px-4 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">Don&rsquo;t save</button>
          <button type="button" autoFocus disabled={busy} onClick={save} className="rounded-full bg-blue-700 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
