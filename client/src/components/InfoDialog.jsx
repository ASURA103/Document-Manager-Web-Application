import useEscapeKey from '../hooks/useEscapeKey.js'
export default function InfoDialog({ title, onClose, children }) {
  useEscapeKey(onClose)
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="mt-3 text-sm">{children}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-full px-4 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50">Close</button>
        </div>
      </div>
    </div>
  )
}
