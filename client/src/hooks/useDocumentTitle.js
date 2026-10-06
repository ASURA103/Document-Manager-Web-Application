import { useEffect } from 'react'

// Sets the browser tab title while the calling page is mounted, and restores the previous one after.
export default function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => { document.title = previous }
  }, [title])
}
