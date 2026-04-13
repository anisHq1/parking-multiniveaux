import { useState, useEffect } from 'react'
import { spotsAPI, sessionsAPI, vehiclesAPI } from '../services/api'

const RATE = 5

export default function ClientForm() {
  const [step, setStep]         = useState(1) // 1=formulaire, 2=confirmation prix
  const [freeSpots, setFreeSpots] = useState([])
  const [loading, setLoading]   = useState(false)
  const [receipt, setReceipt]   = useState(null)
  const [msg, setMsg]           = useState({ text: '', type: '' })

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', password: '',
    plate: '', model: '', color: '',
    floor: '', spot_id: '', planned_duration: 1,
  })

  useEffect(() => {
    if (!form.floor) return
    spotsAPI.getAll({ floor: form.floor, status: 'libre' })
      .then(res => setFreeSpots(res.data))
      .catch(() => setFreeSpots([]))
    setForm(f => ({ ...f, spot_id: '' }))
  }, [form.floor])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const estimated = (parseInt(form.planned_duration) * RATE).toFixed(2)

  const validateStep1 = () => {
    if (!form.first_name || !form.last_name || !form.phone || !form.email)
      return 'Veuillez remplir toutes vos informations personnelles'
    if (!form.plate || !form.model || !form.color)
      return 'Veuillez remplir toutes les informations du véhicule'
    if (!form.floor || !form.spot_id)
      return 'Veuillez choisir un étage et une place'
    return null
  }

  const goToConfirm = () => {
    const err = validateStep1()
    if (err) { setMsg({ text: err, type: 'error' }); return }
    setMsg({ text: '', type: '' })
    setStep(2)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMsg({ text: '', type: '' })
    try {
      // 1. Créer compte utilisateur
      let token, userId
      try {
        const regRes = await fetch('http://localhost:5000/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: form.first_name,
            last_name:  form.last_name,
            email:      form.email,
            phone:      form.phone,
            password:   form.password || form.phone,
          })
        })
        const regData = await regRes.json()
        if (!regRes.ok) {
          // Si email déjà utilisé, essayer de se connecter
          if (regData.error?.includes('déjà')) {
            const loginRes = await fetch('http://localhost:5000/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: form.email, password: form.phone })
            })
            const loginData = await loginRes.json()
            if (!loginRes.ok) throw new Error('Email déjà utilisé avec un autre téléphone')
            token  = loginData.token
            userId = loginData.user.id
          } else {
            throw new Error(regData.error)
          }
        } else {
          token  = regData.token
          userId = regData.user.id
        }
      } catch(e) {
        throw e
      }

      // 2. Créer le véhicule
      const vRes = await fetch('http://localhost:5000/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plate: form.plate.toUpperCase(), model: form.model, color: form.color })
      })
      const vData = await vRes.json()
      if (!vRes.ok && !vData.error?.includes('Plaque')) throw new Error(vData.error)

      // Si plaque existe déjà, chercher le véhicule existant
      let vehicleId = vData.id
      if (!vehicleId) {
        const vListRes = await fetch('http://localhost:5000/api/vehicles', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const vList = await vListRes.json()
        const found = vList.find(v => v.plate === form.plate.toUpperCase())
        if (found) vehicleId = found.id
        else throw new Error('Impossible de trouver le véhicule')
      }

      // 3. Enregistrer l'entrée
      const sRes = await fetch('http://localhost:5000/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          vehicle_id:       vehicleId,
          spot_id:          parseInt(form.spot_id),
          planned_duration: parseInt(form.planned_duration),
        })
      })
      const sData = await sRes.json()
      if (!sRes.ok) throw new Error(sData.error)

      // 4. Afficher le reçu
      setReceipt({
        name:     `${form.first_name} ${form.last_name}`,
        phone:    form.phone,
        plate:    form.plate.toUpperCase(),
        model:    form.model,
        color:    form.color,
        floor:    form.floor,
        spot:     freeSpots.find(s => s.id === parseInt(form.spot_id)),
        duration: form.planned_duration,
        amount:   estimated,
        time:     new Date().toLocaleString('fr-CA'),
      })
      setStep(3)
    } catch (err) {
      setMsg({ text: err.message || 'Erreur lors de l\'enregistrement', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1)
    setReceipt(null)
    setForm({
      first_name: '', last_name: '', phone: '', email: '', password: '',
      plate: '', model: '', color: '',
      floor: '', spot_id: '', planned_duration: 1,
    })
    setFreeSpots([])
    setMsg({ text: '', type: '' })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, background: '#58a6ff',
            borderRadius: 14, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 12,
          }}>P</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#e6edf3' }}>ParkFlow</div>
          <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>Système de stationnement</div>
        </div>

        {/* Étapes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['Informations', 'Confirmation', 'Reçu'].map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 6,
                background: step > i ? '#58a6ff' : step === i + 1 ? '#58a6ff' : '#21262d',
              }}/>
              <div style={{ fontSize: 11, color: step === i + 1 ? '#58a6ff' : '#656d76' }}>{label}</div>
            </div>
          ))}
        </div>

        {msg.text && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: msg.type === 'error' ? 'rgba(248,81,73,.12)' : 'rgba(63,185,80,.12)',
            color: msg.type === 'error' ? '#f85149' : '#3fb950',
            border: `1px solid ${msg.type === 'error' ? 'rgba(248,81,73,.3)' : 'rgba(63,185,80,.3)'}`,
          }}>{msg.text}</div>
        )}

        {/* ── ÉTAPE 1 : FORMULAIRE ── */}
        {step === 1 && (
          <div style={{
            background: '#161b22', border: '1px solid #30363d',
            borderRadius: 14, padding: 28,
          }}>
            {/* Conducteur */}
            <div style={{ fontSize: 11, fontWeight: 600, color: '#656d76', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
              👤 Informations personnelles
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Prénom *</label>
                <input style={inp} name="first_name" value={form.first_name} onChange={handle} placeholder="Jean" />
              </div>
              <div>
                <label style={lbl}>Nom *</label>
                <input style={inp} name="last_name" value={form.last_name} onChange={handle} placeholder="Dupont" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Téléphone *</label>
              <input style={inp} name="phone" value={form.phone} onChange={handle} placeholder="514-555-0100" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Email *</label>
              <input style={inp} type="email" name="email" value={form.email} onChange={handle} placeholder="jean@example.com" />
            </div>

            {/* Véhicule */}
            <div style={{ fontSize: 11, fontWeight: 600, color: '#656d76', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14, paddingTop: 16, borderTop: '1px solid #21262d' }}>
              🚗 Informations véhicule
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Numéro de plaque *</label>
              <input style={{ ...inp, textTransform: 'uppercase' }} name="plate" value={form.plate} onChange={handle} placeholder="AB-123-CD" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Modèle *</label>
                <input style={inp} name="model" value={form.model} onChange={handle} placeholder="Toyota Corolla..." />
              </div>
              <div>
                <label style={lbl}>Couleur *</label>
                <select style={inp} name="color" value={form.color} onChange={handle}>
                  <option value="">Choisir...</option>
                  {['Blanc','Noir','Gris','Rouge','Bleu','Vert','Argent','Orange','Beige'].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stationnement */}
            <div style={{ fontSize: 11, fontWeight: 600, color: '#656d76', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14, paddingTop: 16, borderTop: '1px solid #21262d' }}>
              🅿️ Stationnement
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Étage *</label>
                <select style={inp} name="floor" value={form.floor} onChange={handle}>
                  <option value="">Choisir...</option>
                  {[1,2,3,4].map(f => <option key={f} value={f}>Étage {f}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Place *</label>
                <select style={inp} name="spot_id" value={form.spot_id} onChange={handle} disabled={!form.floor}>
                  <option value="">Choisir...</option>
                  {freeSpots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.zone}-{String(s.spot_number).padStart(2,'0')} ({s.spot_type})
                    </option>
                  ))}
                </select>
                {form.floor && freeSpots.length === 0 && (
                  <div style={{ fontSize: 11, color: '#f85149', marginTop: 4 }}>Aucune place libre</div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>
                Durée prévue : <strong style={{ color: '#58a6ff' }}>{form.planned_duration}h</strong>
              </label>
              <input
                type="range" name="planned_duration"
                min={1} max={24} step={1}
                value={form.planned_duration} onChange={handle}
                style={{ width: '100%', marginTop: 8, accentColor: '#58a6ff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#656d76', marginTop: 4 }}>
                <span>1h min</span><span>24h max</span>
              </div>
            </div>

            {/* Prix estimé */}
            <div style={{
              background: 'rgba(88,166,255,.08)', border: '1px solid rgba(88,166,255,.2)',
              borderRadius: 10, padding: '14px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div>
                <div style={{ fontSize: 13, color: '#58a6ff', fontWeight: 500 }}>Montant estimé</div>
                <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>Tarif : ${RATE}/h · Minimum $5.00</div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#58a6ff' }}>${estimated}</div>
            </div>

            <button
              onClick={goToConfirm}
              style={{
                width: '100%', padding: '12px', background: '#58a6ff', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Voir le récapitulatif →
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : CONFIRMATION ── */}
        {step === 2 && (
          <div style={{
            background: '#161b22', border: '1px solid #30363d',
            borderRadius: 14, padding: 28,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e6edf3', marginBottom: 20 }}>
              Récapitulatif de votre stationnement
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              {[
                ['Conducteur', `${form.first_name} ${form.last_name}`],
                ['Téléphone', form.phone],
                ['Email', form.email],
                ['Plaque', form.plate.toUpperCase()],
                ['Véhicule', `${form.color} ${form.model}`],
                ['Étage', `Étage ${form.floor}`],
                ['Place', freeSpots.find(s => s.id === parseInt(form.spot_id))
                  ? `${freeSpots.find(s => s.id === parseInt(form.spot_id)).zone}-${String(freeSpots.find(s => s.id === parseInt(form.spot_id)).spot_number).padStart(2,'0')}`
                  : '—'
                ],
                ['Durée prévue', `${form.planned_duration}h`],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '10px 0', color: '#8b949e', width: 130 }}>{k}</td>
                  <td style={{ padding: '10px 0', color: '#e6edf3', fontWeight: 500 }}>{v}</td>
                </tr>
              ))}
            </table>

            {/* Prix final */}
            <div style={{
              marginTop: 20, padding: 20,
              background: 'rgba(63,185,80,.08)', border: '2px solid rgba(63,185,80,.3)',
              borderRadius: 12, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: '#3fb950', marginBottom: 6 }}>💰 Montant à payer</div>
              <div style={{ fontSize: 48, fontWeight: 700, color: '#3fb950' }}>${estimated}</div>
              <div style={{ fontSize: 12, color: '#8b949e', marginTop: 6 }}>
                {form.planned_duration}h × ${RATE}/h
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1, padding: '11px', background: 'transparent',
                  color: '#8b949e', border: '1px solid #30363d',
                  borderRadius: 8, fontSize: 14, cursor: 'pointer',
                }}
              >
                ← Modifier
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 2, padding: '11px', background: '#3fb950', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', opacity: loading ? .7 : 1,
                }}
              >
                {loading ? 'Enregistrement...' : '✓ Confirmer et payer $' + estimated}
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : REÇU ── */}
        {step === 3 && receipt && (
          <div style={{
            background: '#161b22', border: '1px solid #30363d',
            borderRadius: 14, padding: 28, textAlign: 'center',
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: 6 }}>
              Stationnement confirmé !
            </h2>
            <p style={{ fontSize: 13, color: '#8b949e', marginBottom: 24 }}>
              Votre place est réservée. Voici votre reçu.
            </p>

            <div style={{
              background: '#0d1117', border: '1px solid #30363d',
              borderRadius: 10, padding: 20, textAlign: 'left', marginBottom: 20,
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                {[
                  ['Client', receipt.name],
                  ['Téléphone', receipt.phone],
                  ['Plaque', receipt.plate],
                  ['Véhicule', `${receipt.color} ${receipt.model}`],
                  ['Étage / Place', receipt.spot ? `Étage ${receipt.floor} — ${receipt.spot.zone}-${String(receipt.spot.spot_number).padStart(2,'0')}` : `Étage ${receipt.floor}`],
                  ['Durée prévue', `${receipt.duration}h`],
                  ['Date/heure', receipt.time],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '8px 0', color: '#8b949e', width: 130 }}>{k}</td>
                    <td style={{ padding: '8px 0', color: '#e6edf3' }}>{v}</td>
                  </tr>
                ))}
              </table>

              <div style={{
                marginTop: 16, padding: '14px', textAlign: 'center',
                background: 'rgba(63,185,80,.08)', borderRadius: 8,
                border: '1px solid rgba(63,185,80,.3)',
              }}>
                <div style={{ fontSize: 11, color: '#3fb950', marginBottom: 4 }}>MONTANT TOTAL</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#3fb950' }}>${receipt.amount}</div>
              </div>
            </div>

            <button
              onClick={reset}
              style={{
                width: '100%', padding: '12px', background: '#58a6ff', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Nouveau stationnement
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 6, fontWeight: 500 }
const inp = {
  width: '100%', padding: '9px 12px',
  background: '#21262d', border: '1px solid #30363d',
  borderRadius: 8, color: '#e6edf3', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
}