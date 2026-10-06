import { X } from 'lucide-react'

// Right-hand panel shared by Version history and Comments. Overlays the page on phones.
export default function SidePanel({ tabs, active, onTab, onClose, children }) {
  return (
    <aside aria-label="Side panel" className="no-print fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl sm:static sm:z-auto sm:w-80 sm:max-w-none sm:shadow-none">
      <div className="flex items-center justify-between border-b border-slate-200 px-2">
        <div role="tablist" aria-label="Panel" className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              onClick={() => onTab(t.id)}
              className={`px-3 py-3 text-sm ${active === t.id ? 'border-b-2 border-blue-700 font-medium text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {t.label}{t.badge ? <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-xs">{t.badge}</span> : null}
            </button>
          ))}
        </div>
        <button aria-label="Close panel" onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100"><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  )
}
