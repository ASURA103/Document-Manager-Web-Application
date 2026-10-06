import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import EditorPage from './pages/EditorPage.jsx'

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
      <Route path="/documents/:id" element={<RequireAuth><EditorPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
