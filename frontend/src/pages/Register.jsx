import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm] = useState({
    prenom: '', nom: '', telephone: '', email: '', password: ''
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription")
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
          <Link to="/login"    className="auth-tab">Connexion</Link>
          <Link to="/register" className="auth-tab active">Inscription</Link>
        </div>

        <p className="auth-subtitle">
          Inscris-toi pour réserver une place et gérer tes véhicules.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-row-2">
            <div className="form-group">
              <label>Prénom</label>
              <input name="prenom" value={form.prenom} onChange={handle} placeholder="Jean" required />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input name="nom" value={form.nom} onChange={handle} placeholder="Dupont" required />
            </div>
          </div>
          <div className="form-group">
            <label>Téléphone (optionnel)</label>
            <input name="telephone" value={form.telephone} onChange={handle} placeholder="514-555-0100" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handle} placeholder="jean@example.com" required />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password" name="password"
              value={form.password} onChange={handle}
              placeholder="Minimum 6 caractères" minLength={6} required
            />
          </div>
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>

        <p className="auth-hint">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
