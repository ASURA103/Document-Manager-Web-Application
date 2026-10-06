import { useState } from 'react'
import useEscapeKey from '../hooks/useEscapeKey.js'

const FORMATS = [
  { id: 'docx', label: 'Microsoft Word', ext: '.docx' },
  { id: 'pdf', label: 'PDF document', ext: '.pdf', note: 'Opens your browser’s print dialog; choose “Save as PDF”.' },
  { id: 'md', label: 'Markdown', ext: '.md' },
  { id: 'txt', label: 'Plain text', ext: '.txt' },
  { id: 'html', label: 'Web page', ext: '.html' },
]

// "Save as" modal: pick a file name and a format, then download.
export default function DownloadDialog({ defaultName, onDownload, onClose }) {
  const [name, setName] = useState(defaultName)
  const [format, setFormat] = useState('docx')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  useEscapeKey(onClose)
  const current = FORMATS.find((f) => f.id === format)

  const submit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Enter a file name.')
    setBusy(true); setError(null)
    try {
      await onDownload(format, trimmed)
      onClose()
    } catch {
      setError('Could not create the file. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Download document" className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" noValidate>
        <h2 className="text-lg font-medium">Download as</h2>

        <label htmlFor="download-name" className="mt-4 block text-sm font-medium">File name</label>
        <div className="mt-1 flex items-center gap-1">
          <input
            id="download-name"
            autoFocus
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          />
          <span className="text-sm text-slate-600" aria-hidden="true">{current.ext}</span>
        </div>
        {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Format</legend>
          <div className="mt-1 space-y-1">
            {FORMATS.map((f) => (
              <label key={f.id} className={`flex cursor-pointer items-center gap-3 rounded border px-3 py-2 text-sm ${format === f.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="format" value={f.id} checked={format === f.id} onChange={() => setFormat(f.id)} />
                <span className="flex-1">{f.label}</span>
                <span className="text-xs text-slate-600">{f.ext}</span>
              </label>
            ))}
          </div>
          {current.note && <p className="mt-1 text-xs text-slate-600">{current.note}</p>}
        </fieldset>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-1.5 text-sm text-blue-700 hover:bg-blue-50">Cancel</button>
          <button disabled={busy} className="rounded-full bg-blue-700 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">{busy ? 'Preparing…' : 'Download'}</button>
        </div>
      </form>
    </div>
  )
}
