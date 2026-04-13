import { useState, useEffect, useCallback } from 'react'
import { sessionsAPI } from '../services/api'

const elapsed = (ms) => {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h${String(m).padStart(2,'0')}m` : `${m}min`
}
const currentCost = (session) => {
  if (session.status === 'completed') return parseFloat(session.amount || 0).toFixed(2)
  const ms = Date.now() - new Date(session.entry_time).getTime()
  return Math.max(5, (ms / 3600000) * 5).toFixed(2)
}

export default function Sessions() {
  const [sessions,      setSessions]      = useState([])
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [loading,       setLoading]       = useState(true)
  const [checkoutModal, setCheckoutModal] = useState(null)
  const [coLoading,     setCoLoading]     = useState(false)
  const [msg,           setMsg]           = useState({ text:'', type:'' })

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text:'', type:'' }), 5000)
  }

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter === 'active') params.status = 'active'
      if (statusFilter === 'done')   params.status = 'completed'
      const res = await sessionsAPI.getAll(params)
      setSessions(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleCheckout = async () => {
    if (!checkoutModal) return
    setCoLoading(true)
    try {
      const res = await sessionsAPI.sortie(checkoutModal.id)
      showMsg(`Sortie enregistrée — $${parseFloat(res.data.amount).toFixed(2)} encaissé`)
      setCheckoutModal(null)
      await fetchSessions()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Erreur serveur', 'error')
    } finally { setCoLoading(false) }
  }

  const filtered = sessions.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.license_plate?.toLowerCase().includes(q) ||
      s.nom?.toLowerCase().includes(q) ||
      s.prenom?.toLowerCase().includes(q) ||
      `${s.zone}-${String(s.spot_number).padStart(2,'0')}`.toLowerCase().includes(q)
    )
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="page-subtitle">Historique et sessions actives</p>
        </div>
        <select className="select-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Toutes</option>
          <option value="active">En cours</option>
          <option value="done">Terminées</option>
        </select>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>
      )}

      <div className="table-card">
        <div className="table-header">
          <div className="search-input-wrap" style={{flex:1,maxWidth:500}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#8b949e">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par plaque, place ou nom..."/>
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="table-loading"><div className="spinner"/></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Véhicule</th><th>Place</th><th>Entrée</th>
                  <th>Sortie</th><th>Statut</th><th>Montant</th>
                  <th>Paiement</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const entry = new Date(s.entry_time)
                  const exit  = s.exit_time ? new Date(s.exit_time) : null
                  const isActive = s.status === 'active'
                  const fmtDate  = d => d.toLocaleString('fr-CA',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="cell-main">{s.license_plate}</div>
                        <div className="cell-sub">{s.prenom} {s.nom}</div>
                      </td>
                      <td>
                        <span className="pill pill-blue">
                          {s.zone}-{String(s.spot_number).padStart(2,'0')} É{s.floor}
                        </span>
                      </td>
                      <td>{fmtDate(entry)}</td>
                      <td>{exit ? fmtDate(exit) : <span className="text-muted">—</span>}</td>
                      <td>
                        <span className={`pill ${isActive ? 'pill-green' : 'pill-gray'}`}>
                          {isActive ? 'En cours' : 'Terminé'}
                        </span>
                      </td>
                      <td className={isActive ? '' : 'cell-amount'}>${currentCost(s)}</td>
                      <td>
                        {isActive
                          ? <span className="text-orange">⏱ En attente</span>
                          : <span className="text-green">✓ Payé</span>
                        }
                      </td>
                      <td>
                        {isActive && (
                          <button className="btn-danger-sm" onClick={() => setCheckoutModal(s)}>
                            Sortie
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!filtered.length && (
                  <tr><td colSpan={8} className="empty-row">Aucune session trouvée</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal sortie */}
      {checkoutModal && (
        <div className="modal-overlay" onClick={() => setCheckoutModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Enregistrer la sortie</h3>
              <button className="modal-close" onClick={() => setCheckoutModal(null)}>✕</button>
            </div>
            <table className="modal-table">
              <tbody>
                <tr><td>Conducteur</td><td><strong>{checkoutModal.prenom} {checkoutModal.nom}</strong></td></tr>
                <tr><td>Plaque</td><td><strong>{checkoutModal.license_plate}</strong></td></tr>
                <tr><td>Véhicule</td><td>{checkoutModal.color} {checkoutModal.brand} {checkoutModal.model}</td></tr>
                <tr><td>Place</td><td>Étage {checkoutModal.floor} — {checkoutModal.zone}-{String(checkoutModal.spot_number).padStart(2,'0')}</td></tr>
                <tr><td>Durée</td><td><strong>{elapsed(Date.now() - new Date(checkoutModal.entry_time))}</strong></td></tr>
                <tr>
                  <td>Montant</td>
                  <td><span className="modal-amount">${currentCost(checkoutModal)}</span></td>
                </tr>
              </tbody>
            </table>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setCheckoutModal(null)}>Annuler</button>
              <button className="btn-primary" onClick={handleCheckout} disabled={coLoading}>
                {coLoading ? 'Traitement...' : 'Confirmer & encaisser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
