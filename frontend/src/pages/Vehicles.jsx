import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { vehiclesAPI } from '../services/api'

export default function Vehicles() {
  const navigate          = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [msg,      setMsg]      = useState({ text: '', type: '' })

  useEffect(() => { fetchVehicles() }, [])

  const fetchVehicles = async () => {
    try {
      const res = await vehiclesAPI.getAll()
      setVehicles(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text:'', type:'' }), 3000)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce véhicule ?')) return
    try {
      await vehiclesAPI.remove(id)
      setVehicles(v => v.filter(x => x.id !== id))
      showMsg('Véhicule supprimé')
    } catch (e) {
      showMsg(e.response?.data?.error || 'Erreur serveur', 'error')
    }
  }

  const filtered = vehicles.filter(v => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      v.plate?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.color?.toLowerCase().includes(q) ||
      v.last_name?.toLowerCase().includes(q) ||
      v.first_name?.toLowerCase().includes(q)
    )
  })

  if (loading) return <div className="page-loading"><div className="spinner"/></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Véhicules</h1>
          <p className="page-subtitle">{vehicles.length} véhicule(s) enregistré(s)</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/ajouter-vehicule')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Ajouter
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>
      )}

      <div className="search-input-wrap" style={{maxWidth:440, marginBottom:20}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#8b949e">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un véhicule..."/>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>Aucun véhicule trouvé</p>
          <button className="btn-primary" onClick={() => navigate('/ajouter-vehicule')}>
            Ajouter le premier véhicule
          </button>
        </div>
      ) : (
        <div className="vehicles-grid">
          {filtered.map(v => (
            <div key={v.id} className="vehicle-card">
              <div className="vc-top">
                <div className="vc-icon">
                  <svg viewBox="0 0 24 24" fill="#58a6ff" width="20" height="20">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
                  </svg>
                </div>
                <div>
                  <div className="vc-plate">{v.license_plate}</div>
                  <div className="vc-model">{v.model} · {v.color}</div>
                </div>
              </div>

              {(v.prenom || v.nom) && (
                <div className="vc-info">
                  <svg viewBox="0 0 24 24" fill="#8b949e" width="13" height="13">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  {v.prenom} {v.nom}
                </div>
              )}
              {v.telephone && (
                <div className="vc-info">
                  <svg viewBox="0 0 24 24" fill="#8b949e" width="13" height="13">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  {v.telephone}
                </div>
              )}

              <div className="vc-tags">
                <span className={`pill ${v.is_parked ? 'pill-red' : 'pill-gray'}`}>
                  {v.is_parked ? `Garé — Étage ${v.floor}` : 'Non garé'}
                </span>
                {v.subscription_type && v.subscription_type !== 'none' && (
                  <span className="pill pill-blue">{v.subscription_type}</span>
                )}
              </div>

              <button
                className="vc-delete"
                onClick={() => handleDelete(v.id)}
                title="Supprimer"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
