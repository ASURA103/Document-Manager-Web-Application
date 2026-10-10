import { useEffect, useState } from 'react'

// True once `pending` has been continuously true for longer than `afterMs`. Used to explain a slow first request:
// the free API host sleeps when idle and can take a while to wake up.
// The timer stores *which pending period* became slow, so no state has to be reset synchronously.
export default function useSlowHint(pending, afterMs = 3000) {
  const [slowFor, setSlowFor] = useState(0) // id of the pending period that exceeded afterMs
  const [period, setPeriod] = useState(0)

  useEffect(() => {
    if (!pending) return undefined
    const id = Date.now()
    const t = setTimeout(() => setSlowFor(id), afterMs)
    setPeriod(id) // eslint-disable-line react-hooks/set-state-in-effect -- marks the start of this pending period
    return () => clearTimeout(t)
  }, [pending, afterMs])

  return pending && slowFor !== 0 && slowFor === period
}
