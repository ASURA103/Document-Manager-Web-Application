import { configureStore } from '@reduxjs/toolkit'
import { api } from '../features/api.js'
import authReducer from '../features/auth/authSlice.js'

export const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer, auth: authReducer },
  middleware: (getDefault) => getDefault().concat(api.middleware),
})
