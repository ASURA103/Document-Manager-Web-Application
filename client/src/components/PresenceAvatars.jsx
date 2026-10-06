const COLORS = ['bg-rose-600', 'bg-emerald-700', 'bg-indigo-700', 'bg-amber-700', 'bg-cyan-700', 'bg-fuchsia-700']
const colorFor = (id) => COLORS[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length]
const MAX_SHOWN = 4

// Small avatars for the other people who have this document open right now.
export default function PresenceAvatars({ people }) {
  if (!people.length) return null
  const shown = people.slice(0, MAX_SHOWN)
  return (
    <div role="group" aria-label="People viewing this document" className="flex items-center -space-x-2">
      {shown.map((p) => (
        <span key={p.id} title={`${p.name} is here`} aria-label={`${p.name} is viewing this document`} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white ${colorFor(p.id)}`}>
          {p.name[0].toUpperCase()}
        </span>
      ))}
      {people.length > MAX_SHOWN && (
        <span title={people.slice(MAX_SHOWN).map((p) => p.name).join(', ')} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-600 text-xs font-medium text-white">+{people.length - MAX_SHOWN}</span>
      )}
    </div>
  )
}
