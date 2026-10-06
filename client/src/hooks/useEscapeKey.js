import { useEffect } from 'react'

// Calls onClose when Escape is pressed while the calling dialog is mounted.
export default function useEscapeKey(onClose) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}
