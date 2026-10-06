import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, LayoutGrid, List, MoreVertical, Plus, Search, Users, X } from 'lucide-react'
import { errorMessage, useCreateDocumentMutation, useDeleteDocumentMutation, useGetDocumentsQuery } from '../features/api.js'
import ImportButton, { IMPORT_TYPES, MAX_MB } from '../components/ImportButton.jsx'
import UserMenu from '../components/UserMenu.jsx'
import ShareDialog from '../components/ShareDialog.jsx'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import Dropdown, { MenuItem } from '../components/Dropdown.jsx'

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function DocCard({ doc, view, onDelete, onShare }) {
  const shared = doc.role !== 'owner'
  const menu = (
    <Dropdown align="right" label={`Options for ${doc.title}`} buttonClass="rounded-full p-1.5 hover:bg-slate-200" trigger={<MoreVertical size={16} />}>
      <MenuItem onClick={() => window.open(`/documents/${doc.id}`, '_blank', 'noopener')}>Open in new tab</MenuItem>
      <MenuItem disabled={shared} onClick={() => onShare(doc)}>Share…</MenuItem>
      <MenuItem danger disabled={shared} onClick={() => onDelete(doc)}>Delete</MenuItem>
    </Dropdown>
  )
  const badge = shared && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">{doc.role}</span>

  if (view === 'list') {
    return (
      <li className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
        <FileText size={20} className="shrink-0 text-blue-600" />
        <Link to={`/documents/${doc.id}`} className="min-w-0 flex-1 truncate text-sm font-medium">{doc.title}</Link>
        {badge}
        <span className="hidden w-40 truncate text-xs text-slate-600 sm:block">{shared ? doc.owner?.name : 'me'}</span>
        <span className="w-28 text-xs text-slate-600">{fmt(doc.updatedAt)}</span>
        {menu}
      </li>
    )
  }
  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-blue-400">
      <Link to={`/documents/${doc.id}`} aria-label={`Open ${doc.title}`} className={`flex h-36 items-center justify-center ${shared ? 'bg-emerald-50' : 'bg-slate-50'}`}>
        {shared ? <Users size={40} strokeWidth={1.25} className="text-emerald-600" /> : <FileText size={40} strokeWidth={1.25} className="text-blue-500" />}
      </Link>
      <div className="border-t border-slate-100 px-3 py-2">
        <Link to={`/documents/${doc.id}`} className="block truncate text-sm font-medium">{doc.title}</Link>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
          <span className="flex min-w-0 items-center gap-1.5">
            <FileText size={14} className="shrink-0 text-blue-600" />
            <span className="truncate">{shared ? doc.owner?.name : 'Edited'} · {fmt(doc.updatedAt)}</span>
            {badge}
          </span>
          {menu}
        </div>
      </div>
    </li>
  )
}

function Section({ title, subtitle, tone, docs, view, empty, onDelete, onShare, action }) {
  return (
    <section aria-label={title} className="mt-8">
      <div className="flex items-baseline gap-2 border-b border-slate-200 pb-2">
        <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-slate-600">{subtitle}</span>
      </div>
      {docs.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-600">{empty}</p>
          {action}
        </div>
      ) : view === 'list' ? (
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          <li aria-hidden="true" className="flex items-center gap-3 px-4 py-1.5 text-xs font-medium text-slate-600">
            <span className="w-5 shrink-0" />
            <span className="flex-1">Name</span>
            <span className="hidden w-40 sm:block">Owner</span>
            <span className="w-28">Modified</span>
            <span className="w-8" />
          </li>
          {docs.map((d) => <DocCard key={d.id} doc={d} view="list" onDelete={onDelete} onShare={onShare} />)}
        </ul>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{docs.map((d) => <DocCard key={d.id} doc={d} view="grid" onDelete={onDelete} onShare={onShare} />)}</ul>
      )}
    </section>
  )
}

export default function DashboardPage() {
  useDocumentTitle('Docs')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  // The input owns its own state (so fast typing is never dropped) and mirrors it to the URL.
  const [q, setQ] = useState(() => params.get('q') || '')
  const updateQuery = (value) => { setQ(value); setParams(value ? { q: value } : {}, { replace: true }) }
  const searchRef = useRef(null)
  const [shareDoc, setShareDoc] = useState(null) // document whose Share dialog is open
  const [view, setView] = useState(() => { try { return localStorage.getItem('docs.view') || 'list' } catch { return 'list' } })
  const [filter, setFilter] = useState('all') // all | owned | shared
  const { data, isLoading, error, refetch } = useGetDocumentsQuery()
  const [createDoc, { isLoading: creating, error: createError }] = useCreateDocumentMutation()
  const [deleteDoc, { error: deleteError }] = useDeleteDocumentMutation()

  const changeView = (v) => { setView(v); try { localStorage.setItem('docs.view', v) } catch { /* optional preference */ } }
  const onCreate = async () => {
    if (creating) return // guard against double clicks creating duplicates
    const res = await createDoc()
    if (!res.error) navigate(`/documents/${res.data.id}`)
  }
  const onDelete = (doc) => {
    if (window.confirm(`Delete "${doc.title}" permanently? Shared access will be removed too.`)) deleteDoc(doc.id)
  }

  // "/" focuses the search box unless the user is already typing somewhere.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      const typing = t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
      if ((e.key === '/' || (e.code === 'Slash' && !e.shiftKey)) && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const match = (d) => d.title.toLowerCase().includes(q.trim().toLowerCase())
  const owned = useMemo(() => (data?.owned || []).filter(match), [data, q]) // eslint-disable-line
  const shared = useMemo(() => (data?.shared || []).filter(match), [data, q]) // eslint-disable-line

  return (
    <div className="min-h-screen bg-[#f9fbfd]">
      <header className="flex items-center gap-4 bg-white px-4 py-2 shadow-sm">
        <Link to="/" className="flex items-center gap-2 text-xl text-slate-700"><FileText size={28} className="text-blue-600" strokeWidth={1.5} /><span className="hidden sm:inline">Docs</span></Link>
        <div className="relative mx-auto w-full max-w-2xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            ref={searchRef}
            type="text"
            role="searchbox"
            value={q}
            onChange={(e) => updateQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && q) updateQuery('') }}
            placeholder="Search documents"
            aria-label="Search documents"
            autoComplete="off"
            className="w-full rounded-full bg-[#e9eef6] py-2.5 pl-11 pr-12 text-sm focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          />
          {q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { updateQuery(''); searchRef.current?.focus() }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <X size={16} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Focus search (shortcut: /)"
              title="Press / to search"
              onClick={() => searchRef.current?.focus()}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white text-xs text-slate-600 hover:border-blue-500 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              /
            </button>
          )}
        </div>
        <UserMenu />
      </header>

      <div className="bg-[#f1f3f4] px-4 py-5">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-sm font-medium text-slate-700">Start a new document</h1>
          <div className="mt-2 flex flex-wrap items-start gap-4">
            <div>
              <button onClick={onCreate} disabled={creating} aria-label="New document" className="flex h-36 w-28 items-center justify-center rounded-lg border border-slate-300 bg-white hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
                <Plus size={44} strokeWidth={1.25} className="text-blue-600" />
              </button>
              <p className="mt-1 text-xs text-slate-600">{creating ? 'Creating…' : 'Blank document'}</p>
            </div>
            <ImportButton />
          </div>
          <p className="mt-2 text-xs text-slate-600">Import supports {IMPORT_TYPES.join(', ')} · Max {MAX_MB} MB</p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-12">
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium">Recent documents</h2>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter documents" className="rounded border border-slate-300 bg-white px-2 py-1 text-sm">
              <option value="all">All documents</option>
              <option value="owned">Owned by me</option>
              <option value="shared">Shared with me</option>
            </select>
            <button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => changeView('grid')} className={`rounded-full p-2 hover:bg-slate-200 ${view === 'grid' ? 'bg-blue-100' : ''}`}><LayoutGrid size={18} /></button>
            <button aria-label="List view" aria-pressed={view === 'list'} onClick={() => changeView('list')} className={`rounded-full p-2 hover:bg-slate-200 ${view === 'list' ? 'bg-blue-100' : ''}`}><List size={18} /></button>
          </div>
        </div>

        {createError && <p role="alert" className="mt-2 text-sm text-red-600">{errorMessage(createError, 'Unable to create document.')}</p>}
        {deleteError && <p role="alert" className="mt-2 text-sm text-red-600">{errorMessage(deleteError, 'Unable to delete document.')}</p>}
        {isLoading && <p className="mt-6 text-sm text-slate-600">Loading documents…</p>}
        {error && <p role="alert" className="mt-6 text-sm text-red-600">{errorMessage(error, 'Unable to load documents.')} <button onClick={refetch} className="underline">Retry</button></p>}

        {data && (
          <>
            {filter !== 'shared' && (
              <Section title="My documents" subtitle="Owned by you" tone="bg-blue-500" docs={owned} view={view} onDelete={onDelete} onShare={setShareDoc}
                empty={q ? 'No matching documents.' : 'No documents yet. Create your first document.'}
                action={!q && <button onClick={onCreate} disabled={creating} className="mt-3 rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">Create document</button>} />
            )}
            {filter !== 'owned' && (
              <Section title="Shared with me" subtitle="Shared by other people" tone="bg-emerald-500" docs={shared} view={view} onDelete={onDelete} onShare={setShareDoc}
                empty={q ? 'No matching documents.' : 'No documents have been shared with you.'} />
            )}
          </>
        )}
      </main>

      {shareDoc && <ShareDialog documentId={shareDoc.id} onClose={() => setShareDoc(null)} />}
    </div>
  )
}
