import { useState, useEffect } from 'react'

const API = 'https://parking-multiniveaux.onrender.com/api'

const RATE_COLORS = {
  standard:   { bg: 'rgba(88,166,255,.12)',  border: 'rgba(88,166,255,.3)',  color: '#58a6ff',  icon: '🚗' },
  vip:        { bg: 'rgba(188,140,255,.12)', border: 'rgba(188,140,255,.3)', color: '#bc8cff',  icon: '👑' },
  handicap:   { bg: 'rgba(210,153,34,.12)',  border: 'rgba(210,153,34,.3)',  color: '#d29922',  icon: '♿' },
  electrique: { bg: 'rgba(63,185,80,.12)',   border: 'rgba(63,185,80,.3)',   color: '#3fb950',  icon: '⚡' },
}

export default function ClientFormV2() {
  const [screen, setScreen]       = useState('start')   // start | form | payment | waiting | approved | rejected
  const [rates, setRates] = useState({ standard:5.00, vip:13.99, handicap:6.99, electrique:10.99 })
  const [spots,  setSpots]        = useState([])
  const [loading, setLoading]     = useState(false)
  const [requestId, setRequestId] = useState(null)
  const [requestData, setRequestData] = useState(null)
  const [msg, setMsg]             = useState('')

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    plate: '', model: '', color: '',
    floor: '', spot_id: '', spot_type: '', planned_duration: 1,
  })

  // Charger les tarifs au démarrage
  useEffect(() => {
    fetch(`${API}/rates`)
      .then(r => r.json())
      .then(data => {
        const rObj = {}
        data.forEach(r => { rObj[r.spot_type] = parseFloat(r.hourly_rate) })
        setRates(rObj)
      })
      .catch(() => setRates({ standard:5, vip:13.99, handicap:6.99, electrique:10.99 }))
  }, [])

  // Charger les places libres quand l'étage change
  useEffect(() => {
    if (!form.floor) return
    fetch(`${API}/spots?floor=${form.floor}&status=libre`)
      .then(r => r.json())
      .then(data => setSpots(data))
      .catch(() => setSpots([]))
    setForm(f => ({ ...f, spot_id: '', spot_type: '' }))
  }, [form.floor])

  // Polling statut quand en attente
  useEffect(() => {
    if (screen !== 'waiting' || !requestId) return
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/requests/${requestId}/status`)
        const data = await res.json()
        if (data.status === 'approved') {
          setRequestData(data)
          setScreen('approved')
          clearInterval(interval)
        } else if (data.status === 'rejected') {
          setScreen('rejected')
          clearInterval(interval)
        }
      } catch {}
    }, 3000) // Vérifier toutes les 3 secondes
    return () => clearInterval(interval)
  }, [screen, requestId])

  const handle = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    // Auto-sélectionner le type de la place choisie
    if (name === 'spot_id') {
      const spot = spots.find(s => s.id === parseInt(value))
      if (spot) setForm(f => ({ ...f, spot_id: value, spot_type: spot.spot_type }))
    }
  }

  const hourlyRate = rates[form.spot_type] || 5
  const total      = (hourlyRate * parseInt(form.planned_duration || 1)).toFixed(2)

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.phone || !form.email)
      return setMsg('Veuillez remplir toutes vos informations')
    if (!form.plate || !form.model || !form.color)
      return setMsg('Veuillez remplir les informations du véhicule')
    if (!form.spot_id)
      return setMsg('Veuillez choisir une place')

    setMsg('')
    setScreen('payment')
  }

  const handlePayment = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          spot_id:          parseInt(form.spot_id),
          floor:            parseInt(form.floor),
          planned_duration: parseInt(form.planned_duration),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRequestId(data.id)
      setScreen('waiting')
    } catch (err) {
      setMsg(err.message || 'Erreur lors de la soumission')
      setScreen('form')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setScreen('start')
    setRequestId(null)
    setRequestData(null)
    setMsg('')
    setForm({
      first_name:'', last_name:'', phone:'', email:'',
      plate:'', model:'', color:'',
      floor:'', spot_id:'', spot_type:'', planned_duration:1,
    })
  }

  const S = styles

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ══════════════ ÉCRAN START ══════════════ */}
        {screen === 'start' && (
          <div style={{ textAlign: 'center' }}>
            <div style={S.logo}>P</div>
            <h1 style={S.h1}>ParkFlow</h1>
            <p style={S.subtitle}>Système de stationnement intelligent</p>

            {/* Tarifs */}
            <div style={{ marginBottom: 40 }}>
              <p style={{ color: '#8b949e', fontSize: 14, marginBottom: 16 }}>Nos tarifs</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.entries(rates).map(([type, rate]) => {
                  const style = RATE_COLORS[type] || RATE_COLORS.standard
                  return (
                    <div key={type} style={{
                      background: style.bg, border: `1px solid ${style.border}`,
                      borderRadius: 12, padding: '16px 12px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{style.icon}</div>
                      <div style={{ fontSize: 12, color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                        {type}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: style.color }}>
                        ${rate.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: '#656d76' }}>par heure</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <button onClick={() => setScreen('form')} style={S.btnStart}>
              🅿️ Démarrer une réservation
            </button>
          </div>
        )}

        {/* ══════════════ ÉCRAN FORMULAIRE ══════════════ */}
        {screen === 'form' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button onClick={() => setScreen('start')} style={S.btnBack}>←</button>
              <div>
                <h2 style={S.h2}>Votre réservation</h2>
                <p style={{ color: '#8b949e', fontSize: 13, margin: 0 }}>Remplissez vos informations</p>
              </div>
            </div>

            {msg && <div style={S.alertError}>{msg}</div>}

            {/* Section 1 — Conducteur */}
            <div style={S.section}>
              <div style={S.sectionTitle}>👤 Informations personnelles</div>
              <div style={S.row2}>
                <div>
                  <label style={S.label}>Prénom *</label>
                  <input style={S.input} name="first_name" value={form.first_name} onChange={handle} placeholder="Jean" />
                </div>
                <div>
                  <label style={S.label}>Nom *</label>
                  <input style={S.input} name="last_name" value={form.last_name} onChange={handle} placeholder="Dupont" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Téléphone *</label>
                <input style={S.input} name="phone" value={form.phone} onChange={handle} placeholder="514-555-0100" />
              </div>
              <div>
                <label style={S.label}>Email *</label>
                <input style={S.input} type="email" name="email" value={form.email} onChange={handle} placeholder="jean@example.com" />
              </div>
            </div>

            {/* Section 2 — Véhicule */}
            <div style={S.section}>
              <div style={S.sectionTitle}>🚗 Votre véhicule</div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Numéro de plaque *</label>
                <input style={{ ...S.input, textTransform: 'uppercase' }} name="plate" value={form.plate} onChange={handle} placeholder="AB-123-CD" />
              </div>
              <div style={S.row2}>
                <div>
                  <label style={S.label}>Modèle *</label>
                  <input style={S.input} name="model" value={form.model} onChange={handle} placeholder="Toyota Corolla" />
                </div>
                <div>
                  <label style={S.label}>Couleur *</label>
                  <select style={S.input} name="color" value={form.color} onChange={handle}>
                    <option value="">Choisir...</option>
                    {['Blanc','Noir','Gris','Rouge','Bleu','Vert','Argent','Orange','Beige'].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3 — Place */}
            <div style={S.section}>
              <div style={S.sectionTitle}>🅿️ Choisir votre place</div>
              <div style={S.row2}>
                <div>
                  <label style={S.label}>Étage *</label>
                  <select style={S.input} name="floor" value={form.floor} onChange={handle}>
                    <option value="">Choisir...</option>
                    {[1,2,3,4].map(f => <option key={f} value={f}>Étage {f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Place *</label>
                  <select style={S.input} name="spot_id" value={form.spot_id} onChange={handle} disabled={!form.floor}>
                    <option value="">Choisir...</option>
                   {spots.map(s => (
                    <option key={s.id} value={s.id}>
                    {s.zone}-{String(s.spot_number).padStart(2,'0')} — {s.spot_type} (${(rates[s.spot_type] || 5).toFixed(2)}/h)
                   </option>
                  ))}
                  </select>
                  {form.floor && spots.length === 0 && (
                    <p style={{ fontSize: 12, color: '#f85149', marginTop: 4 }}>Aucune place libre à cet étage</p>
                  )}
                </div>
              </div>

              {/* Type de place sélectionné */}
              {form.spot_type && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: RATE_COLORS[form.spot_type]?.bg,
                  border: `1px solid ${RATE_COLORS[form.spot_type]?.border}`,
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>{RATE_COLORS[form.spot_type]?.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: RATE_COLORS[form.spot_type]?.color, textTransform: 'capitalize' }}>
                      Place {form.spot_type}
                    </div>
                    <div style={{ fontSize: 12, color: '#8b949e' }}>
                      Tarif : ${hourlyRate.toFixed(2)}/heure
                    </div>
                  </div>
                </div>
              )}

              {/* Durée */}
              <div style={{ marginTop: 16 }}>
                <label style={S.label}>
                  Durée prévue : <strong style={{ color: '#58a6ff' }}>{form.planned_duration}h</strong>
                </label>
                <input
                  type="range" name="planned_duration"
                  min={1} max={24} step={1}
                  value={form.planned_duration} onChange={handle}
                  style={{ width: '100%', marginTop: 8, accentColor: '#58a6ff' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#656d76', marginTop: 4 }}>
                  <span>1h</span><span>12h</span><span>24h</span>
                </div>
              </div>

              {/* Prix total */}
              {form.spot_type && (
                <div style={{
                  marginTop: 16, padding: '16px 20px',
                  background: 'rgba(63,185,80,.08)', border: '1px solid rgba(63,185,80,.3)',
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#3fb950', fontWeight: 500 }}>💰 Montant total</div>
                    <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                      {form.planned_duration}h × ${hourlyRate.toFixed(2)}/h
                    </div>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: '#3fb950' }}>${total}</div>
                </div>
              )}
            </div>

            <button onClick={handleSubmit} style={S.btnPrimary}>
              Continuer vers le paiement →
            </button>
          </div>
        )}

        {/* ══════════════ ÉCRAN PAIEMENT ══════════════ */}
        {screen === 'payment' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button onClick={() => setScreen('form')} style={S.btnBack}>←</button>
              <div>
                <h2 style={S.h2}>Récapitulatif & Paiement</h2>
                <p style={{ color: '#8b949e', fontSize: 13, margin: 0 }}>Vérifiez et confirmez</p>
              </div>
            </div>

            {/* Récap */}
            <div style={S.section}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                {[
                  ['Conducteur', `${form.first_name} ${form.last_name}`],
                  ['Téléphone',  form.phone],
                  ['Email',      form.email],
                  ['Plaque',     form.plate.toUpperCase()],
                  ['Véhicule',   `${form.color} ${form.model}`],
                  ['Étage',      `Étage ${form.floor}`],
                  ['Place',      spots.find(s => s.id === parseInt(form.spot_id))
                    ? `${spots.find(s=>s.id===parseInt(form.spot_id)).zone}-${String(spots.find(s=>s.id===parseInt(form.spot_id)).spot_number).padStart(2,'0')} (${form.spot_type})`
                    : '—'
                  ],
                  ['Durée',      `${form.planned_duration}h`],
                  ['Tarif',      `$${hourlyRate.toFixed(2)}/h`],
                ].map(([k,v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '9px 0', color: '#8b949e', width: 120 }}>{k}</td>
                    <td style={{ padding: '9px 0', color: '#e6edf3', fontWeight: 500 }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>

            {/* Montant */}
            <div style={{
              padding: 24, background: 'rgba(63,185,80,.08)',
              border: '2px solid rgba(63,185,80,.4)', borderRadius: 14,
              textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: '#3fb950', marginBottom: 8 }}>💳 Montant à payer</div>
              <div style={{ fontSize: 56, fontWeight: 700, color: '#3fb950' }}>${total}</div>
              <div style={{ fontSize: 12, color: '#8b949e', marginTop: 6 }}>
                {form.planned_duration}h × ${hourlyRate.toFixed(2)}/h
              </div>
            </div>

            {/* Simulateur paiement (remplacer par Stripe en production) */}
            <div style={{
              padding: '16px', background: '#21262d',
              border: '1px solid #30363d', borderRadius: 10, marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 12, textAlign: 'center' }}>
                💳 Informations de paiement
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={S.label}>Numéro de carte</label>
                <input style={S.input} placeholder="4242 4242 4242 4242" maxLength={19} />
              </div>
              <div style={S.row2}>
                <div>
                  <label style={S.label}>Expiration</label>
                  <input style={S.input} placeholder="MM/AA" maxLength={5} />
                </div>
                <div>
                  <label style={S.label}>CVV</label>
                  <input style={S.input} placeholder="123" maxLength={3} type="password" />
                </div>
              </div>
            </div>

            {msg && <div style={S.alertError}>{msg}</div>}

            <button onClick={handlePayment} disabled={loading} style={{
              ...S.btnPrimary,
              background: loading ? '#2d333b' : '#3fb950',
            }}>
              {loading ? 'Traitement...' : `✓ Payer $${total} et envoyer la demande`}
            </button>
          </div>
        )}

        {/* ══════════════ ÉCRAN ATTENTE ══════════════ */}
        {screen === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 80, height: 80, margin: '0 auto 24px',
              border: '4px solid #21262d', borderTopColor: '#58a6ff',
              borderRadius: '50%', animation: 'spin 1s linear infinite',
            }}/>
            <h2 style={S.h2}>En attente d'approbation</h2>
            <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 24px' }}>
              Votre demande a été envoyée à l'administrateur.<br/>
              La page se mettra à jour automatiquement dès que votre stationnement sera approuvé.
            </p>
            <div style={{
              padding: '12px 20px', background: 'rgba(88,166,255,.08)',
              border: '1px solid rgba(88,166,255,.3)', borderRadius: 10,
              fontSize: 13, color: '#58a6ff', display: 'inline-block',
            }}>
              🔔 Demande #{requestId} — Vérification en cours...
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ══════════════ ÉCRAN APPROUVÉ ══════════════ */}
        {screen === 'approved' && requestData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🚗</div>
            <div style={{
              fontSize: 40, marginBottom: 8,
              animation: 'flash 0.5s ease-in-out 3',
            }}>🟢</div>
            <h2 style={{ ...S.h2, color: '#3fb950', marginBottom: 8 }}>Barrière ouverte !</h2>
            <p style={{ color: '#8b949e', fontSize: 14, marginBottom: 28 }}>
              Votre stationnement est approuvé. Vous pouvez entrer.
            </p>

            <div style={{
              background: '#161b22', border: '1px solid #30363d',
              borderRadius: 14, padding: 24, textAlign: 'left', marginBottom: 24,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#656d76', textTransform: 'uppercase', marginBottom: 14 }}>
                🧾 Votre reçu
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                {[
                  ['Client',     `${requestData.first_name} ${requestData.last_name}`],
                  ['Plaque',     requestData.plate],
                  ['Étage',      `Étage ${requestData.floor}`],
                  ['Place',      requestData.zone && requestData.spot_number
                    ? `${requestData.zone}-${String(requestData.spot_number).padStart(2,'0')} (${requestData.spot_type})`
                    : requestData.spot_type
                  ],
                  ['Durée',      `${requestData.planned_duration}h`],
                  ['Approuvé le', new Date(requestData.approved_at).toLocaleString('fr-CA')],
                ].map(([k,v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '8px 0', color: '#8b949e', width: 120 }}>{k}</td>
                    <td style={{ padding: '8px 0', color: '#e6edf3' }}>{v}</td>
                  </tr>
                ))}
              </table>

              <div style={{
                marginTop: 16, padding: '14px', textAlign: 'center',
                background: 'rgba(63,185,80,.08)', borderRadius: 8,
                border: '1px solid rgba(63,185,80,.3)',
              }}>
                <div style={{ fontSize: 11, color: '#3fb950', marginBottom: 4 }}>MONTANT PAYÉ</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#3fb950' }}>
                  ${requestData.total_amount}
                </div>
              </div>
            </div>

            <button onClick={reset} style={S.btnPrimary}>
              Nouvelle réservation
            </button>
            <style>{`@keyframes flash { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
          </div>
        )}

        {/* ══════════════ ÉCRAN REJETÉ ══════════════ */}
        {screen === 'rejected' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
            <h2 style={{ ...S.h2, color: '#f85149' }}>Demande refusée</h2>
            <p style={{ color: '#8b949e', fontSize: 14, marginBottom: 28 }}>
              Votre demande a été refusée par l'administrateur.<br/>
              Veuillez réessayer ou contacter le support.
            </p>
            <button onClick={reset} style={{ ...S.btnPrimary, background: '#f85149' }}>
              Réessayer
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', background: '#0d1117',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: { width: '100%', maxWidth: 520 },
  logo: {
    width: 64, height: 64, background: '#58a6ff', borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 30, fontWeight: 700, color: '#fff',
    margin: '0 auto 16px',
  },
  h1: { fontSize: 28, fontWeight: 700, color: '#e6edf3', margin: '0 0 8px', textAlign: 'center' },
  h2: { fontSize: 20, fontWeight: 600, color: '#e6edf3', margin: 0 },
  subtitle: { color: '#8b949e', fontSize: 14, margin: '0 0 32px', textAlign: 'center' },
  section: {
    background: '#161b22', border: '1px solid #30363d',
    borderRadius: 12, padding: 20, marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 600, color: '#656d76',
    textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16,
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  label: { display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 6, fontWeight: 500 },
  input: {
    width: '100%', padding: '9px 12px', background: '#21262d',
    border: '1px solid #30363d', borderRadius: 8,
    color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  },
  btnStart: {
    width: '100%', padding: '16px', background: '#58a6ff', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600,
    cursor: 'pointer', letterSpacing: '.02em',
  },
  btnPrimary: {
    width: '100%', padding: '13px', background: '#58a6ff', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: 'pointer',
  },
  btnBack: {
    width: 36, height: 36, background: '#21262d', border: '1px solid #30363d',
    borderRadius: 8, color: '#e6edf3', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  alertError: {
    padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
    background: 'rgba(248,81,73,.12)', color: '#f85149',
    border: '1px solid rgba(248,81,73,.3)',
  },
}