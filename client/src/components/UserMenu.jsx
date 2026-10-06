import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../features/auth/authSlice.js'
import { api } from '../features/api.js'
import Dropdown, { MenuItem } from './Dropdown.jsx'

// beforeSignOut (optional) may return false to cancel, e.g. when the user chooses to keep editing.
export default function UserMenu({ beforeSignOut }) {
  const user = useSelector((s) => s.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const switchUser = async () => {
    if (beforeSignOut && !(await beforeSignOut())) return
    dispatch(logout())
    // Drop every cached response so the next user never sees the previous user's data.
    dispatch(api.util.resetApiState())
    navigate('/login')
  }

  return (
    <Dropdown
      align="right"
      label="Account"
      buttonClass="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-sm font-medium text-white"
      trigger={user?.name?.[0]?.toUpperCase() || '?'}
    >
      <div className="px-4 py-2 text-sm"><div className="font-medium">{user?.name}</div><div className="text-xs text-slate-600">{user?.email}</div></div>
      <MenuItem onClick={switchUser}>Switch user / Sign out</MenuItem>
    </Dropdown>
  )
}
