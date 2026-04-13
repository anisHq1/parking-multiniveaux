import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout           from './components/Layout/Layout'
import Login            from './pages/Login'
import Register         from './pages/Register'
import Dashboard        from './pages/Dashboard'
import ParkingPlan      from './pages/ParkingPlan'
import Vehicles         from './pages/Vehicles'
import Sessions         from './pages/Sessions'
import GestionPlaces    from './pages/GestionPlaces'
import AjouterVehicule  from './pages/AjouterVehicule'
import Reservations     from './pages/Reservations'
import ClientFormV2     from './pages/ClientFormV2'
import AdminRequests    from './pages/AdminRequests'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ✅ Page client PUBLIQUE — sans login */}
          <Route path="/client" element={<ClientFormV2 />} />

          {/* Auth */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Admin avec sidebar */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"        element={<Dashboard />} />
            <Route path="plan"             element={<ParkingPlan />} />
            <Route path="vehicules"        element={<Vehicles />} />
            <Route path="sessions"         element={<Sessions />} />
            <Route path="gestion-places"   element={<GestionPlaces />} />
            <Route path="ajouter-vehicule" element={<AjouterVehicule />} />
            <Route path="reservations"     element={<Reservations />} />
            <Route path="demandes"         element={<AdminRequests />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}