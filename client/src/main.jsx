import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store.js'
import App from './App.jsx'
import './index.css'
import { normalizeApiBase } from './features/apiBase.js'

// The free API host sleeps when idle. Ask it to wake up right away, while the user is still on the login page.
const apiBase = normalizeApiBase(import.meta.env.VITE_B_URL)
fetch(`${apiBase}/health`, { cache: 'no-store' }).catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
