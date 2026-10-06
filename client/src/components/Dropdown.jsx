import { useEffect, useRef, useState } from 'react'

// Minimal click-outside / Escape-closing menu used by the menu bar, user menu and card menus.
export default function Dropdown({ label, trigger, children, align = 'left', buttonClass = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={buttonClass}
      >
        {trigger}
      </button>
      {open && (
        <div role="menu" onClick={() => setOpen(false)} className={`absolute z-30 mt-1 min-w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

export const MenuItem = ({ onClick, children, shortcut, disabled, danger, active }) => (
  <button
    role="menuitem"
    type="button"
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex w-full items-center justify-between gap-6 px-4 py-1.5 text-left text-sm hover:bg-slate-100 disabled:opacity-40 ${danger ? 'text-red-600' : ''} ${active ? 'font-semibold text-blue-700' : ''}`}
  >
    <span>{children}</span>
    {shortcut && <span className="text-xs text-slate-600">{shortcut}</span>}
  </button>
)

export const MenuDivider = () => <div className="my-1 h-px bg-slate-200" />
