import { useState, useEffect } from 'react'
import { reserveAPI, vehiclesAPI, spotsAPI } from '../services/api'

export default function Reservations() {
  const [reservations, setReservations] = useState([])
  const [vehicles,     setVehicles]     = useState([])
  const [freeSpots,    setFreeSpots]    = useState([])
  const [showForm,     setShowForm]     = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [msg,          setMsg]          = useState({ text:'', type:'' })

  const [form, setForm] = useState({
    vehicle_id:'', floor:'', spot_id:'', start_time:'', end_time:''
  })

  useEffect(() => {
    Promise.all([
      reserveAPI.getAll(),
      vehiclesAPI.getAll(),
    ]).then(([r, v]) => {
      setReservations(r.data)
      setVehicles(v.data)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!form.floor) return
    spotsAPI.getAll({ floor: form.floor, status: 'libre' })
      .then(res => setFreeSpots(res.data))
      .catch(console.error)
    setForm(f => ({ ...f, spot_id:'' }))
  }, [form.floor])

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text:'', type:'' }), 4000)
  }

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    try {
      const res = await reserveAPI.create({
        vehicle_id: parseInt(form.vehicle_id),
        spot_id:    parseInt(form.spot_id),
        start_time: form.start_time,
        end_time:   form.end_time,
      })
      setReservations(r => [res.data, ...r])
      showMsg('Réservation créée avec succès !')
      setShowForm(false)
      setForm({ vehicle_id:'', floor:'', spot_id:'', start_time:'', end_time:'' })
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erreur serveur', 'error')
    }
  }

  const cancel = async (id) => {
    if (!window.confirm('Annuler cette réservation ?')) return
    try {
      await reserveAPI.cancel(id)
      setReservations(r => r.filter(x => x.id !== id))
      showMsg('Réservation annulée')
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erreur', 'error')
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner"/></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Réservations</h1>
          <p className="page-subtitle">{reservations.length} réservation(s) active(s)</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Fermer' : '+ Nouvelle réservation'}
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>
      )}

      {/* Formulaire nouvelle réservation */}
      {showForm && (
        <form className="add-form" onSubmit={submit} style={{marginBottom:24}}>
          <div className="form-section">
            <div className="section-title">
              <span className="section-num">1</span>
              Nouvelle réservation
            </div>
            <div className="form-group">
              <label>Véhicule <span className="required">*</span></label>
              <select name="vehicle_id" value={form.vehicle_id} onChange={handle} required>
                <option value="">Choisir un véhicule...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} — {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Étage <span className="required">*</span></label>
                <select name="floor" value={form.floor} onChange={handle} required>
                  <option value="">Choisir...</option>
                  {[1,2,3,4].map(f => <option key={f} value={f}>Étage {f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Place <span className="required">*</span></label>
                <select name="spot_id" value={form.spot_id} onChange={handle} required disabled={!form.floor}>
                  <option value="">Choisir...</option>
                  {freeSpots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.zone}-{String(s.spot_number).padStart(2,'0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Début <span className="required">*</span></label>
                <input type="datetime-local" name="start_time" value={form.start_time} onChange={handle} required/>
              </div>
              <div className="form-group">
                <label>Fin <span className="required">*</span></label>
                <input type="datetime-local" name="end_time" value={form.end_time} onChange={handle} required/>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn-primary">Confirmer la réservation</button>
            </div>
          </div>
        </form>
      )}

      {/* Tableau */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Véhicule</th><th>Place</th>
                <th>Début</th><th>Fin</th><th>Statut</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="cell-main">{r.license_plate}</div>
                    <div className="cell-sub">{r.prenom} {r.nom}</div>
                  </td>
                  <td>
                    <span className="pill pill-blue">
                      {r.zone}-{String(r.spot_number).padStart(2,'0')} É{r.floor}
                    </span>
                  </td>
                  <td>{new Date(r.start_time).toLocaleString('fr-CA',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                  <td>{new Date(r.end_time).toLocaleString('fr-CA',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                  <td><span className="pill pill-orange">Réservée</span></td>
                  <td>
                    <button className="btn-danger-sm" onClick={() => cancel(r.id)}>Annuler</button>
                  </td>
                </tr>
              ))}
              {!reservations.length && (
                <tr><td colSpan={6} className="empty-row">Aucune réservation active</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
