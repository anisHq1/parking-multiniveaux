import { useState, useEffect } from 'react'
import { spotsAPI } from '../services/api'

export default function GestionPlaces() {
  const [spots,       setSpots]       = useState([])
  const [search,      setSearch]      = useState('')
  const [floorFilter, setFloorFilter] = useState('all')
  const [loading,     setLoading]     = useState(true)
  const [msg,         setMsg]         = useState({ text:'', type:'' })

  useEffect(() => { fetchSpots() }, [])

  const fetchSpots = async () => {
    try {
      const res = await spotsAPI.getAll()
      setSpots(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text:'', type:'' }), 3000)
  }

  const toggleMaintenance = async (spot) => {
    const newStatus = spot.status === 'maintenance' ? 'libre' : 'maintenance'
    try {
      await spotsAPI.update(spot.id, { status: newStatus, spot_type: spot.spot_type })
      setSpots(prev => prev.map(s => s.id === spot.id ? { ...s, status: newStatus } : s))
      showMsg(`Place ${spot.zone}-${String(spot.spot_number).padStart(2,'0')} : ${newStatus}`)
    } catch (e) {
      showMsg(e.response?.data?.error || 'Accès admin requis', 'error')
    }
  }

  const filtered = spots.filter(s => {
    if (floorFilter !== 'all' && s.floor !== parseInt(floorFilter)) return false
    if (search) {
      const q   = search.toLowerCase()
      const num = `${s.zone}-${String(s.spot_number).padStart(2,'0')}`
      return num.toLowerCase().includes(q) || s.license_plate?.toLowerCase().includes(q)
    }
    return true
  })

  const summary = {
    total: spots.length,
    libre: spots.filter(s => s.status === 'libre').length,
    occupee: spots.filter(s => s.status === 'occupee').length,
  }

  if (loading) return <div className="page-loading"><div className="spinner"/></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des places</h1>
          <p className="page-subtitle">
            {summary.total} places — {summary.libre} libres / {summary.occupee} occupées
          </p>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>
      )}

      <div className="filter-row">
        <div className="search-input-wrap" style={{maxWidth:360}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#8b949e">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une place..."/>
        </div>
        <select className="select-input" value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
          <option value="all">Tous les étages</option>
          {[1,2,3,4].map(f => <option key={f} value={f}>Étage {f}</option>)}
        </select>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Numéro</th><th>Étage</th><th>Zone</th>
                <th>Type</th><th>Statut</th><th>Véhicule</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const num = `${s.zone}-${String(s.spot_number).padStart(2,'0')}`
                const pillCls = {
                  libre:       'pill-green',
                  occupee:     'pill-red',
                  reservee:    'pill-orange',
                  maintenance: 'pill-gray',
                }[s.status] || 'pill-gray'
                const pillLabel = {
                  libre:'Libre', occupee:'Occupée', reservee:'Réservée', maintenance:'Maintenance'
                }[s.status] || s.status
                return (
                  <tr key={s.id}>
                    <td><strong>{num}</strong></td>
                    <td>Étage {s.floor}</td>
                    <td>Zone {s.zone}</td>
                    <td style={{textTransform:'capitalize'}}>{s.spot_type}</td>
                    <td><span className={`pill ${pillCls}`}>{pillLabel}</span></td>
                    <td>
                      {s.license_plate
                        ? <span style={{fontSize:12,color:'#8b949e'}}>{s.license_plate}</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        {(s.status === 'libre' || s.status === 'maintenance') && (
                          <button
                            className={s.status === 'maintenance' ? 'btn-icon-green' : 'btn-icon-warn'}
                            onClick={() => toggleMaintenance(s)}
                            title={s.status === 'maintenance' ? 'Remettre en service' : 'Mettre en maintenance'}
                          >
                            {s.status === 'maintenance' ? '✓' : '⚠'}
                          </button>
                        )}
                        <button className="btn-icon" title="Modifier">✎</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={7} className="empty-row">Aucune place trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
