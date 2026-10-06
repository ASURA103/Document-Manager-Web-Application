import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { errorMessage, useLoginMutation } from '../features/api.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'

const schema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
})

// The demo panel is on by default so reviewers can test sharing; set VITE_SHOW_DEMO_ACCOUNTS=false for a real deployment.
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false'

// Seeded demo accounts (see README). Shortcuts only fill the form; they don't bypass the password check.
const DEMO_PASSWORD = 'Demo@1234'
const DEMO_ACCOUNTS = [
  { name: 'Alice Anderson', email: 'alice@example.com' },
  { name: 'Bob Brown', email: 'bob@example.com' },
  { name: 'Carol Clark', email: 'carol@example.com' },
]

export default function LoginPage() {
  useDocumentTitle('Sign in – Docs')
  const navigate = useNavigate()
  const [login, { isLoading }] = useLoginMutation()
  const { register, handleSubmit, setValue, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values) => {
    const res = await login(values)
    if (res.error) return setError('root', { message: errorMessage(res.error, 'Unable to sign in.') })
    navigate('/')
  }

  const fillDemo = (email) => {
    setValue('email', email)
    setValue('password', DEMO_PASSWORD)
  }

  return (
    <div className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Document Manager</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in to continue.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
        <div>
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="username" {...register('email')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          {errors.email && <p role="alert" className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input id="password" type="password" autoComplete="current-password" {...register('password')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          {errors.password && <p role="alert" className="text-xs text-red-600">{errors.password.message}</p>}
        </div>
        {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
        <button disabled={isLoading} className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {SHOW_DEMO && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Demo accounts</p>
          <p className="text-xs text-slate-600">Click to fill the form (password: {DEMO_PASSWORD}).</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((u) => (
              <li key={u.email}>
                <button type="button" onClick={() => fillDemo(u.email)} className="rounded border border-slate-200 px-3 py-1 text-xs hover:border-indigo-400 hover:bg-indigo-50">
                  {u.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
