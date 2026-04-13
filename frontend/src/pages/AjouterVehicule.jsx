import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { vehiclesAPI, spotsAPI, sessionsAPI } from '../services/api'

const RATE = 5

export default function AjouterVehicule() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    prenom: '', nom: '', telephone: '',
    license_plate: '', brand: '', model: '',
    color: '', subscription_type: 'none',
    floor: '', spot_id: '', planned_duration: 2,
  })
  const [freeSpots, setFreeSpots] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState({ text:'', type:'' })

  /* Recharger les places libres quand l'étage change */
  useEffect(() => {
    if (!form.floor) return
    spotsAPI.getAll({ floor: form.floor, status: 'libre' })
      .then(res => setFreeSpots(res.data))
      .catch(console.error)
    setForm(f => ({ ...f, spot_id: '' }))
  }, [form.floor])

  const handle = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text:'', type:'' }), 4000)
  }

  const estimated = (parseInt(form.planned_duration) * RATE).toFixed(2)

  const submit = async e => {
    e.preventDefault()
    if (!form.spot_id) { showMsg('Veuillez choisir une place', 'error'); return }
    setLoading(true)
    try {
      /* 1 — Créer le véhicule */
      const vRes = await vehiclesAPI.create({
        license_plate:     form.license_plate.toUpperCase(),
        brand:             form.brand,
        model:             form.model,
        color:             form.color,
        subscription_type: form.subscription_type,
      })
      /* 2 — Enregistrer l'entrée */
      await sessionsAPI.entry({
        vehicle_id:       vRes.data.id,
        spot_id:          parseInt(form.spot_id),
        planned_duration: parseInt(form.planned_duration),
      })
      showMsg('Véhicule enregistré et entrée créée avec succès !')
      setTimeout(() => navigate('/sessions'), 2000)
    } catch (err) {
      showMsg(err.response?.data?.error || "Erreur lors de l'enregistrement", 'error')
    } finally { setLoading(false) }
  }

  const reset = () => {
    setForm({
      prenom:'', nom:'', telephone:'',
      license_plate:'', brand:'', model:'',
      color:'', subscription_type:'none',
      floor:'', spot_id:'', planned_duration:2,
    })
    setFreeSpots([])
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ajouter un véhicule</h1>
          <p className="page-subtitle">Enregistrer l'entrée d'un nouveau véhicule</p>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>
      )}

      <form className="add-form" onSubmit={submit}>

        {/* Section 1 — Conducteur */}
        <div className="form-section">
          <div className="section-title">
            <span className="section-num">1</span>
            Informations conducteur
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Prénom <span className="required">*</span></label>
              <input name="prenom" value={form.prenom} onChange={handle} placeholder="Jean" required/>
            </div>
            <div className="form-group">
              <label>Nom <span className="required">*</span></label>
              <input name="nom" value={form.nom} onChange={handle} placeholder="Dupont" required/>
            </div>
          </div>
          <div className="form-group">
            <label>Téléphone <span className="required">*</span></label>
            <input name="telephone" value={form.telephone} onChange={handle} placeholder="+1 514 000 0000" required/>
          </div>
        </div>

        {/* Section 2 — Véhicule */}
        <div className="form-section">
          <div className="section-title">
            <span className="section-num">2</span>
            Informations véhicule
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Marque <span className="required">*</span></label>
              <select name="brand" value={form.brand} onChange={handle} required>
                <option value="">Sélectionner...</option>
                {['Toyota','Honda','Ford','Chevrolet','BMW','Mercedes','Volkswagen',
                  'Hyundai','Nissan','Mazda','Audi','Kia','Renault','Peugeot','Dacia',
                  'Fiat','Opel','Skoda','Seat','Volvo'].map(b => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Modèle <span className="required">*</span></label>
              <input name="model" value={form.model} onChange={handle} placeholder="Corolla, Civic..." required/>
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Couleur <span className="required">*</span></label>
              <select name="color" value={form.color} onChange={handle} required>
                <option value="">Couleur...</option>
                {['Blanc','Noir','Gris','Rouge','Bleu','Vert','Argent','Orange','Beige','Marron'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Numéro de plaque <span className="required">*</span></label>
              <input
                name="license_plate" value={form.license_plate} onChange={handle}
                placeholder="AB-123-CD" required
                style={{textTransform:'uppercase'}}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Type d'abonnement</label>
            <select name="subscription_type" value={form.subscription_type} onChange={handle}>
              <option value="none">Sans abonnement</option>
              <option value="mensuel">Mensuel</option>
              <option value="annuel">Annuel</option>
            </select>
          </div>
        </div>

        {/* Section 3 — Stationnement */}
        <div className="form-section">
          <div className="section-title">
            <span className="section-num">3</span>
            Stationnement
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Étage <span className="required">*</span></label>
              <select name="floor" value={form.floor} onChange={handle} required>
                <option value="">Choisir un étage...</option>
                {[1,2,3,4].map(f => <option key={f} value={f}>Étage {f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Place <span className="required">*</span></label>
              <select name="spot_id" value={form.spot_id} onChange={handle} required disabled={!form.floor}>
                <option value="">Choisir une place...</option>
                {freeSpots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.zone}-{String(s.spot_number).padStart(2,'0')} ({s.spot_type})
                  </option>
                ))}
              </select>
              {form.floor && freeSpots.length === 0 && (
                <span style={{fontSize:11,color:'#f85149',marginTop:4,display:'block'}}>
                  Aucune place libre à cet étage
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>
              Durée prévue :
              <strong style={{color:'#58a6ff',marginLeft:8}}>{form.planned_duration}h</strong>
            </label>
            <input
              type="range" name="planned_duration"
              min={1} max={24} step={1}
              value={form.planned_duration} onChange={handle}
              style={{width:'100%',marginTop:8,accentColor:'#58a6ff'}}
            />
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#656d76',marginTop:4}}>
              <span>1h</span><span>12h</span><span>24h</span>
            </div>
          </div>

          <div className="price-preview">
            <div>
              <div className="price-label">Montant estimé</div>
              <div style={{fontSize:11,color:'#8b949e',marginTop:2}}>Tarif : ${RATE}/h · Minimum $5.00</div>
            </div>
            <div className="price-value">${estimated}</div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={reset}>Effacer</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enregistrement...' : '✓ Enregistrer l\'entrée'}
          </button>
        </div>
      </form>
    </div>
  )
}
