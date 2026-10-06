import useEscapeKey from '../hooks/useEscapeKey.js'
import { useState } from 'react'

// Adds https:// to bare hosts. Anything with an explicit non-http(s)/mailto scheme
// (javascript:, data:, file:, ...) is left as-is so it fails validation below.
// "host:port" (e.g. localhost:3000) has digits after the colon and is treated as a bare host.
const normalize = (raw) => {
  const url = raw.trim()
  if (!url) return ''
  if (/^(https?:|mailto:)/i.test(url)) return url
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(url)) return url
  return `https://${url}`
}

// Only http(s)/mailto links are allowed; anything else (javascript:, data:) is rejected.
const isSafeUrl = (url) => /^(https?:\/\/|mailto:)/i.test(url)

export default function LinkDialog({ initial = '', onApply, onRemove, onClose }) {
  useEscapeKey(onClose)
  const [value, setValue] = useState(initial)
  const [error, setError] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    const url = normalize(value)
    if (!url || !isSafeUrl(url)) return setError('Enter a valid http(s) or mailto link.')
    onApply(url)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Insert link" className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-medium">Insert link</h2>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste a link" aria-label="Link URL" className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-between">
          <button type="button" onClick={onRemove} className="text-sm text-red-600 hover:underline">Remove link</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-1.5 text-sm text-blue-700 hover:bg-blue-50">Cancel</button>
            <button className="rounded-full bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800">Apply</button>
          </div>
        </div>
      </form>
    </div>
  )
}
