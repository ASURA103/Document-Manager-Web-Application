import { useState } from 'react'
import {
  errorMessage, useAddCommentMutation, useDeleteCommentMutation, useGetCommentsQuery, useUpdateCommentMutation,
} from '../features/api.js'

const MAX = 2000
const when = (d) => new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// Document-level comments. Anyone who can open the document may comment, including view-only users.
export default function CommentsPanel({ documentId }) {
  const { data, isLoading, error } = useGetCommentsQuery(documentId)
  const [addComment, { isLoading: adding }] = useAddCommentMutation()
  const [updateComment] = useUpdateCommentMutation()
  const [deleteComment] = useDeleteCommentMutation()
  const [text, setText] = useState('')
  const [formError, setFormError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return setFormError('Write a comment first.')
    const res = await addComment({ id: documentId, body })
    if (res.error) return setFormError(errorMessage(res.error, 'Unable to add the comment.'))
    setText(''); setFormError(null)
  }
  const toggle = async (c) => {
    setActionError(null)
    const res = await updateComment({ id: documentId, commentId: c.id, resolved: !c.resolved })
    if (res.error) setActionError(errorMessage(res.error, 'Unable to update the comment.'))
  }
  const remove = async (c) => {
    if (!window.confirm('Delete this comment?')) return
    setActionError(null)
    const res = await deleteComment({ id: documentId, commentId: c.id })
    if (res.error) setActionError(errorMessage(res.error, 'Unable to delete the comment.'))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading && <p className="text-sm text-slate-600">Loading comments…</p>}
        {error && <p role="alert" className="text-sm text-red-700">{errorMessage(error, 'Unable to load comments.')}</p>}
        {data && data.length === 0 && <p className="mt-6 text-center text-sm text-slate-600">No comments yet. Start the conversation below.</p>}
        {data && data.length > 0 && (
          <ul aria-label="Comments" className="space-y-3">
            {data.map((c) => (
              <li key={c.id} className={`rounded border p-3 text-sm ${c.resolved ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-300 bg-white'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.author?.name || 'Unknown'}</span>
                  <span className="text-xs text-slate-600">{when(c.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  {c.resolved && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">Resolved</span>}
                  {c.permissions.resolve && <button onClick={() => toggle(c)} className="text-blue-800 hover:underline">{c.resolved ? 'Reopen' : 'Resolve'}</button>}
                  {c.permissions.delete && <button onClick={() => remove(c)} className="text-red-700 hover:underline">Delete</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {actionError && <p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
      </div>
      <form onSubmit={submit} className="border-t border-slate-200 p-3" noValidate>
        <label htmlFor="new-comment" className="sr-only">Add a comment</label>
        <textarea
          id="new-comment"
          value={text}
          maxLength={MAX}
          rows={3}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-slate-600">{text.length}/{MAX}</span>
          <button disabled={adding} className="rounded-full bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">{adding ? 'Posting…' : 'Comment'}</button>
        </div>
        {formError && <p role="alert" className="mt-1 text-xs text-red-700">{formError}</p>}
      </form>
    </div>
  )
}
