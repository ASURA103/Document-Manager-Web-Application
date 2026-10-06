// VITE_B_URL should be the API root including /api (e.g. https://api.example.com/api).
// If it was configured without the suffix, add it, so a missing "/api" cannot silently break every request.
export function normalizeApiBase(raw) {
  const base = (raw || '/api').trim().replace(/\/+$/, '')
  return /\/api$/.test(base) ? base : `${base}/api`
}
