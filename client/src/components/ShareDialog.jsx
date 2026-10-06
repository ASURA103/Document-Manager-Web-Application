import useEscapeKey from '../hooks/useEscapeKey.js'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { errorMessage, useAddShareMutation, useGetSharesQuery, useRemoveShareMutation } from '../features/api.js'

const schema = z.object({
  email: z.email('Enter a valid email.'),
  permission: z.enum(['viewer', 'editor']),
})

export default function ShareDialog({ documentId, onClose }) {
  useEscapeKey(onClose)
  const { data, isLoading, error } = useGetSharesQuery(documentId)
  const [addShare, { isLoading: adding }] = useAddShareMutation()
  const [removeShare, { isLoading: removing, error: removeError }] = useRemoveShareMutation()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', permission: 'viewer' },
  })

  const onSubmit = async (values) => {
    const res = await addShare({ id: documentId, ...values })
    if (res.error) return setError('root', { message: errorMessage(res.error, 'Unable to share document.') })
    reset({ email: '', permission: values.permission })
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Share Document" className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share Document</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-600 hover:text-slate-800">✕</button>
        </div>

        {isLoading && <p className="mt-3 text-sm text-slate-600">Loading…</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{errorMessage(error)}</p>}
        {data && (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            <li className="flex justify-between py-2"><span>{data.owner.name} <span className="text-slate-600">{data.owner.email}</span></span><span className="font-medium">Owner</span></li>
            {data.shares.map((s) => (
              <li key={s.user.id} className="flex items-center justify-between py-2">
                <span>{s.user.name} <span className="text-slate-600">{s.user.email}</span></span>
                <span className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{s.permission}</span>
                  <button disabled={removing} onClick={() => removeShare({ id: documentId, userId: s.user.id })} className="text-xs text-red-600 hover:underline">Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {removeError && <p role="alert" className="mt-2 text-sm text-red-600">{errorMessage(removeError)}</p>}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-2" noValidate>
          <div className="flex gap-2">
            <input {...register('email')} type="email" placeholder="user@example.com" aria-label="User email" className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm" />
            <select {...register('permission')} aria-label="Permission" className="rounded border border-slate-300 px-2 text-sm">
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button disabled={adding} className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{adding ? 'Sharing…' : 'Share'}</button>
          </div>
          {errors.email && <p role="alert" className="text-xs text-red-600">{errors.email.message}</p>}
          {errors.root && <p role="alert" className="text-xs text-red-600">{errors.root.message}</p>}
        </form>
      </div>
    </div>
  )
}
