import { createSlice } from '@reduxjs/toolkit'

const KEY = 'docs.auth'

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || { token: null, user: null } }
  catch { return { token: null, user: null } }
}
const persist = (state) => {
  try {
    if (state.token) localStorage.setItem(KEY, JSON.stringify(state))
    else localStorage.removeItem(KEY)
  }
  catch { /* storage unavailable: session just won't survive refresh */ }
}

const slice = createSlice({
  name: 'auth',
  initialState: load(),
  reducers: {
    setCredentials(state, { payload }) {
      state.token = payload.token
      state.user = payload.user
      persist(state)
    },
    logout(state) {
      state.token = null
      state.user = null
      persist(state)
    },
  },
})

export const { setCredentials, logout } = slice.actions
export default slice.reducer
