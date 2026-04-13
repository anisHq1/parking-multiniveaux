import { useState, useEffect } from 'react'
import { spotsAPI, sessionsAPI } from '../services/api'

export default function ParkingPlan() {
  const [spots,     setSpots]     = useState([])
  const [summary,   setSummary]   = useState({ floors: [] })
  const [floor,     setFloor]     = useState(1)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [selected,  setSelected]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [coLoading, setCoLoading] = useState(false)
  const [msg,       setMsg]       = useState({ text: '', type: '' })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [s, sm] = await Promise.all([spotsAPI.getAll(), spotsAPI.summary()])
      setSpots(s.data)
      setSummary(sm.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 4000)
  }

  const handleCheckout = async (sessionId) => {
    setCoLoading(true)
    try {
      const res = await sessionsAPI.sortie(sessionId)
      showMsg(`Sortie enregistrée — Montant: $${parseFloat(res.data.amount).toFixed(2)}`)
      setSelected(null)
      await fetchAll()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Erreur serveur', 'error')
    } finally { setCoLoading(false) }
  }

  const floorData = (f) => summary.floors?.find(x => x.floor === f) || {}

  const visibleSpots = spots.filter(s => {
    if (s.floor !== floor) return false
    if (filter !== 'all' && s.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        `${s.zone}-${String(s.spot_number).padStart(2,'0')}`.toLowerCase().includes(q) ||
        s.license_plate?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const zones = ['A','B','C','D','E']

  if (loading) return <div className="page-loading"><div className="spinner"/></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Plan du parking</h1>
          <p className="page-subtitle">Visualisation en temps réel des places</p>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>
          {msg.text}
        </div>
      )}

      {/* Cartes étages */}
      <div className="floor-cards">
        {[1,2,3,4].map(f => {
          const fd  = floorData(f)
          const pct = parseInt(fd.pct || 0)
          const col = pct < 60 ? '#3fb950' : pct < 80 ? '#d29922' : '#f85149'
          return (
            <div
              key={f}
              className={`floor-card${floor === f ? ' active' : ''}`}
              onClick={() => setFloor(f)}
            >
              <div className="floor-card-top">
                <span className="floor-card-num">Étage {f}</span>
                <span style={{fontSize:16,fontWeight:700,color:col}}>{pct}%</span>
              </div>
              <div className="floor-card-sub">{fd.free || 0}/{fd.total || 25} libres</div>
              <div className="floor-card-bar">
                <div className="floor-card-fill" style={{width:`${pct}%`,background:col}}/>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtres */}
      <div className="plan-filters">
        <div className="search-input-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#8b949e">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par numéro ou plaque..."/>
        </div>
        <select className="select-input" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Tous les statuts</option>
          <option value="libre">Libre</option>
          <option value="occupee">Occupée</option>
          <option value="reservee">Réservée</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Légende */}
      <div className="plan-legend">
        <div className="legend-section">
          <span className="leg-label">STATUTS :</span>
          <span className="leg"><span className="leg-dot" style={{background:'#3fb950'}}/>Libre</span>
          <span className="leg"><span className="leg-dot" style={{background:'#f85149'}}/>Occupé</span>
          <span className="leg"><span className="leg-dot" style={{background:'#d29922'}}/>Réservé</span>
          <span className="leg"><span className="leg-dot" style={{background:'#656d76'}}/>Maintenance</span>
        </div>
        <div className="legend-section">
          <span className="leg-label">TYPES :</span>
          <span className="leg">🚗 Standard</span>
          <span className="leg">⚡ Électrique</span>
          <span className="leg">♿ Handicap</span>
          <span className="leg">👑 VIP</span>
        </div>
      </div>

      {/* Grille par zones */}
      <div className="table-card">
        {zones.map(zone => {
          const zoneSpots = visibleSpots.filter(s => s.zone === zone)
          if (!zoneSpots.length) return null
          const free = zoneSpots.filter(s => s.status === 'libre').length
          return (
            <div key={zone} className="zone-section">
              <div className="zone-header">
                <div className="zone-header-left">
                  <div className="zone-label">{zone}</div>
                  <h4>Zone {zone}</h4>
                </div>
                <span className="zone-count">{free}/{zoneSpots.length} libres</span>
              </div>
              <div className="spots-grid">
                {zoneSpots.map(spot => {
                  const num = `${spot.zone}-${String(spot.spot_number).padStart(2,'0')}`
                  const cls = { libre:'spot-free', occupee:'spot-occ', reservee:'spot-res', maintenance:'spot-maint' }[spot.status] || 'spot-free'
                  const icon = { vip:'👑', electrique:'⚡', handicap:'♿' }[spot.spot_type] || ''
                  return (
                    <div
                      key={spot.id}
                      className={`spot ${cls}`}
                      onClick={() => spot.status !== 'libre' && setSelected(spot)}
                      title={spot.license_plate || 'Libre'}
                    >
                      <div className="spot-num">{num} {icon}</div>
                      <div className="spot-info">
                        {spot.license_plate || (spot.status === 'libre' ? 'Libre' : spot.status)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal détail place */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Place {selected.zone}-{String(selected.spot_number).padStart(2,'0')}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <table className="modal-table">
              <tbody>
                <tr><td>Conducteur</td><td><strong>{selected.prenom} {selected.nom}</strong></td></tr>
                <tr><td>Téléphone</td><td>{selected.telephone || '—'}</td></tr>
                <tr><td>Véhicule</td><td>{selected.color} {selected.brand} {selected.model}</td></tr>
                <tr><td>Plaque</td><td><strong>{selected.license_plate}</strong></td></tr>
                <tr><td>Étage</td><td>Étage {selected.floor}</td></tr>
                <tr><td>Type place</td><td style={{textTransform:'capitalize'}}>{selected.spot_type}</td></tr>
                {selected.entry_time && (
                  <tr><td>Entrée</td><td>{new Date(selected.entry_time).toLocaleString('fr-CA')}</td></tr>
                )}
              </tbody>
            </table>
            {selected.session_id && (
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
                <button className="btn-primary" onClick={() => handleCheckout(selected.session_id)} disabled={coLoading}>
                  {coLoading ? 'Traitement...' : 'Enregistrer la sortie'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
