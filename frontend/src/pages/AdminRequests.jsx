import { useState, useEffect } from 'react'
import { requestsAPI } from '../services/api'

const STATUS_STYLES = {
  pending:   { bg: 'rgba(210,153,34,.12)',  color: '#d29922',  border: 'rgba(210,153,34,.3)',  label: '⏳ En attente' },
  approved:  { bg: 'rgba(63,185,80,.12)',   color: '#3fb950',  border: 'rgba(63,185,80,.3)',   label: '✅ Approuvé' },
  rejected:  { bg: 'rgba(248,81,73,.12)',   color: '#f85149',  border: 'rgba(248,81,73,.3)',   label: '❌ Rejeté' },
  completed: { bg: 'rgba(88,166,255,.12)',  color: '#58a6ff',  border: 'rgba(88,166,255,.3)',  label: '🏁 Terminé' },
}

const TYPE_ICONS = { standard: '🚗', vip: '👑', handicap: '♿', electrique: '⚡' }

export default function AdminRequests() {
  const [requests,  setRequests]  = useState([])
  const [filter,    setFilter]    = useState('pending')
  const [loading,   setLoading]   = useState(true)
  const [actionId,  setActionId]  = useState(null)
  const [msg,       setMsg]       = useState({ text: '', type: '' })
  const [barriere,  setBarriere]  = useState(null) // ID de la demande dont la barrière est ouverte

  useEffect(() => {
    fetchRequests()
    // Rafraîchir toutes les 10 secondes pour voir les nouvelles demandes
    const interval = setInterval(fetchRequests, 10000)
    return () => clearInterval(interval)
  }, [filter])

  const fetchRequests = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const res    = await requestsAPI.getAll(params)
      setRequests(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 5000)
  }

  const handleApprove = async (id) => {
    setActionId(id)
    try {
      await requestsAPI.approve(id)
      setBarriere(id) // Afficher animation barrière
      showMsg('✅ Demande approuvée — Barrière ouverte !')
      await fetchRequests()
      // Fermer l'animation après 5 secondes
      setTimeout(() => setBarriere(null), 5000)
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erreur lors de l\'approbation', 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (id) => {
    if (!window.confirm('Rejeter cette demande ?')) return
    setActionId(id)
    try {
      await requestsAPI.reject(id)
      showMsg('Demande rejetée — Place libérée', 'error')
      await fetchRequests()
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erreur', 'error')
    } finally {
      setActionId(null)
    }
  }

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Demandes de stationnement
            {pending.length > 0 && (
              <span style={{
                marginLeft: 12, padding: '3px 10px',
                background: 'rgba(210,153,34,.2)', color: '#d29922',
                border: '1px solid rgba(210,153,34,.4)',
                borderRadius: 20, fontSize: 13, fontWeight: 600,
              }}>
                {pending.length} en attente
              </span>
            )}
          </h1>
          <p className="page-subtitle">Approuvez ou rejetez les demandes des clients</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {['pending','approved','rejected','all'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '7px 14px',
                background: filter === s ? '#58a6ff' : 'var(--bg2)',
                color: filter === s ? '#fff' : 'var(--txt2)',
                border: `1px solid ${filter === s ? '#58a6ff' : 'var(--bd)'}`,
                borderRadius: 8, fontSize: 13, cursor: 'pointer',
              }}
            >
              {s === 'pending' ? '⏳ En attente' : s === 'approved' ? '✅ Approuvées' : s === 'rejected' ? '❌ Rejetées' : '📋 Toutes'}
            </button>
          ))}
        </div>
      </div>

      {/* Animation barrière ouverte */}
      {barriere && (
        <div style={{
          padding: '16px 20px', marginBottom: 20,
          background: 'rgba(63,185,80,.12)', border: '2px solid rgba(63,185,80,.4)',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14,
          animation: 'pulse 1s ease-in-out infinite',
        }}>
          <div style={{ fontSize: 48 }}>🚧</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#3fb950' }}>🟢 BARRIÈRE OUVERTE</div>
            <div style={{ fontSize: 13, color: '#8b949e' }}>Le véhicule peut entrer — Demande #{barriere}</div>
          </div>
          <button
            onClick={() => setBarriere(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 18 }}
          >✕</button>
        </div>
      )}

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 20 }}>
          {msg.text}
        </div>
      )}

      {/* Liste des demandes */}
      {loading ? (
        <div className="page-loading"><div className="spinner"/></div>
      ) : requests.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem',
          background: 'var(--bg1)', border: '1px solid var(--bd)',
          borderRadius: 12, color: 'var(--txt2)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <p style={{ fontSize: 16 }}>
            {filter === 'pending' ? 'Aucune demande en attente' : 'Aucune demande trouvée'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {requests.map(r => {
            const st     = STATUS_STYLES[r.status] || STATUS_STYLES.pending
            const isAct  = actionId === r.id
            const isPend = r.status === 'pending'
            return (
              <div key={r.id} style={{
                background: 'var(--bg1)', border: '1px solid var(--bd)',
                borderRadius: 14, padding: 20,
                borderLeft: isPend ? '4px solid #d29922' : '4px solid var(--bd)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  {/* Info principale */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 20 }}>{TYPE_ICONS[r.spot_type] || '🚗'}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)' }}>
                          {r.first_name} {r.last_name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{r.email} · {r.phone}</div>
                      </div>
                      <span style={{
                        marginLeft: 'auto', padding: '3px 10px',
                        background: st.bg, color: st.color,
                        border: `1px solid ${st.border}`,
                        borderRadius: 20, fontSize: 11, fontWeight: 500, flexShrink: 0,
                      }}>
                        {st.label}
                      </span>
                    </div>

                    {/* Détails */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 12, padding: '12px 0',
                      borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)',
                      marginBottom: 12,
                    }}>
                      {[
                        ['🚘 Plaque',    r.plate],
                        ['🚗 Véhicule',  `${r.color} ${r.model}`],
                        ['🏢 Place',     r.zone
                          ? `Étage ${r.floor} — ${r.zone}-${String(r.spot_number).padStart(2,'0')}`
                          : `Étage ${r.floor}`
                        ],
                        ['⏱ Durée',     `${r.planned_duration}h`],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 3 }}>{k}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt)' }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Demande #{r.id} · </span>
                        <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                          {new Date(r.created_at).toLocaleString('fr-CA', {
                            day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
                          })}
                        </span>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#3fb950' }}>
                        ${parseFloat(r.total_amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Boutons action (seulement si en attente) */}
                {isPend && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                      onClick={() => handleReject(r.id)}
                      disabled={isAct}
                      style={{
                        flex: 1, padding: '10px',
                        background: 'rgba(248,81,73,.12)', color: '#f85149',
                        border: '1px solid rgba(248,81,73,.3)',
                        borderRadius: 8, fontSize: 14, fontWeight: 500,
                        cursor: 'pointer', opacity: isAct ? .6 : 1,
                      }}
                    >
                      ✕ Rejeter
                    </button>
                    <button
                      onClick={() => handleApprove(r.id)}
                      disabled={isAct}
                      style={{
                        flex: 2, padding: '10px',
                        background: '#3fb950', color: '#fff',
                        border: 'none', borderRadius: 8,
                        fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', opacity: isAct ? .6 : 1,
                      }}
                    >
                      {isAct ? 'Traitement...' : '🚧 Approuver & Ouvrir la barrière'}
                    </button>
                  </div>
                )}

                {/* Info si approuvé */}
                {r.status === 'approved' && r.barrier_opened && (
                  <div style={{
                    marginTop: 12, padding: '8px 14px',
                    background: 'rgba(63,185,80,.08)', border: '1px solid rgba(63,185,80,.2)',
                    borderRadius: 8, fontSize: 12, color: '#3fb950',
                  }}>
                    🟢 Barrière ouverte le {new Date(r.approved_at).toLocaleString('fr-CA', {
                      day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
      `}</style>
    </div>
  )
}