import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-box">P</div>
          <div>
            <div className="logo-title">ParkFlow</div>
            <div className="logo-sub">SMART PARKING</div>
          </div>
        </div>

        <div className="auth-tabs">
          <Link to="/login"    className="auth-tab active">Connexion</Link>
          <Link to="/register" className="auth-tab">Inscription</Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email" name="email"
              value={form.email} onChange={handle}
              placeholder="admin@parkflow.com" required
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password" name="password"
              value={form.password} onChange={handle}
              placeholder="••••••••" required
            />
          </div>
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-hint">
          Pas encore de compte ? <Link to="/register">S'inscrire</Link>
        </p>
        <p className="auth-demo">Démo : admin@parkflow.com / admin123</p>
      </div>
    </div>
  )
}
