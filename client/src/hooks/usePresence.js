import { useEffect, useState } from 'react'
import { useDispatch, useStore } from 'react-redux'
import { api } from '../features/api.js'
import { normalizeApiBase } from '../features/apiBase.js'

const BEAT_MS = 10_000

// Presence requests are sent strictly one after another. Without this, a heartbeat and a "leave" fired at the
// same moment (e.g. React re-running the effect) could reach the server in the wrong order and wrongly erase the user.
let queue = Promise.resolve()
const inOrder = (task) => {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

// Sends a heartbeat while the document is open and the tab is visible; returns everyone seen recently
// (including the current user). Uses the shared API client, so auth and 401 handling stay in one place.
export default function usePresence(documentId) {
  const dispatch = useDispatch()
  const store = useStore()
  const [people, setPeople] = useState([])

  useEffect(() => {
    let stopped = false
    const beat = async () => {
      if (document.visibilityState === 'hidden') return // no heartbeats from background tabs
      const res = await inOrder(() => dispatch(api.endpoints.heartbeat.initiate(documentId, { track: false })))
      if (!stopped && res.data) setPeople(res.data)
    }
    const onVisible = () => { if (document.visibilityState === 'visible') beat() }
    // Closing or reloading the tab skips React's cleanup, so send a "leave" that survives page unload
    // (fetch keepalive; the shared API client cannot set it). If it is lost, the server's TTL still expires the entry.
    const onPageHide = () => {
      const token = store.getState().auth.token
      fetch(`${normalizeApiBase(import.meta.env.VITE_B_URL)}/documents/${documentId}/presence`, {
        method: 'DELETE', keepalive: true, headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    beat()
    const timer = setInterval(beat, BEAT_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onPageHide)
      inOrder(() => dispatch(api.endpoints.leavePresence.initiate(documentId, { track: false }))) // disappear right away
    }
  }, [dispatch, store, documentId])

  return people
}
