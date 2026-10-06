import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { errorMessage, useImportDocumentMutation } from '../features/api.js'

const MAX_MB = 1
const IMPORT_TYPES = ['.txt', '.md', '.html', '.csv', '.tsv', '.docx', '.xlsx']
const ACCEPT = IMPORT_TYPES.join(',')

// A tile that matches the "Blank document" tile: click to browse, or drop a file onto it.
export default function ImportButton() {
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const [importDoc, { isLoading }] = useImportDocumentMutation()
  const [status, setStatus] = useState(null) // { type: 'error' | 'success', text }
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setStatus(null)
    if (file.size > MAX_MB * 1024 * 1024) return setStatus({ type: 'error', text: `File too large (max ${MAX_MB} MB).` })
    const res = await importDoc(file)
    if (res.error) return setStatus({ type: 'error', text: errorMessage(res.error, 'Unable to import file.') })
    setStatus({ type: 'success', text: 'Imported successfully.' })
    navigate(`/documents/${res.data.id}`)
  }

  const onPick = (e) => {
    const file = e.target.files[0]
    e.target.value = '' // allow re-selecting the same file
    handleFile(file)
  }
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={onPick} aria-label="Choose a file to import" className="hidden" data-testid="import-input" />
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={isLoading}
        aria-label="Import file"
        className={`flex h-36 w-28 flex-col items-center justify-center gap-2 rounded-lg border bg-white text-slate-700 hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 ${dragging ? 'border-blue-600 bg-blue-50' : 'border-dashed border-slate-400'}`}
      >
        <Upload size={32} strokeWidth={1.25} className="text-blue-600" />
        <span className="px-2 text-center text-xs">{isLoading ? 'Importing…' : 'Drop a file or browse'}</span>
      </button>
      <p className="mt-1 text-xs text-slate-600">Import file</p>
      {status && (
        <p role={status.type === 'error' ? 'alert' : 'status'} className={`mt-1 max-w-[16rem] text-xs ${status.type === 'error' ? 'text-red-700' : 'text-green-800'}`}>
          {status.text}
        </p>
      )}
    </div>
  )
}

export { IMPORT_TYPES, MAX_MB }
