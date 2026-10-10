import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
const EditorPage = lazy(() => import('./pages/EditorPage.jsx')) // Tiptap stays out of the login/dashboard bundle

function RequireAuth({ children }) {
  const token = useSelector((s) => s.auth.token)
  return token ? children : <Navigate to="/login" replace />
}

// Each page renders its own header (home bar vs. editor menus), like Google Docs.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/documents/:id" element={<RequireAuth><Suspense fallback={<p className="p-6 text-sm text-slate-600">Loading editor…</p>}><EditorPage /></Suspense></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
