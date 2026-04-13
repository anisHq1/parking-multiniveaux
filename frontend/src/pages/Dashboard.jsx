import { useState, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Filler, Tooltip, Legend
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { dashboardAPI } from '../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend)

const floorColor = pct =>
  pct < 60 ? '#3fb950' : pct < 80 ? '#d29922' : '#f85149'

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 30_000)
    return () => clearInterval(t)
  }, [])

  const fetchData = async () => {
    try {
      const res = await dashboardAPI.get()
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner"/></div>

  const spots  = data?.spots  || {}
  const floors = data?.floors || []
  const rev    = data?.revenue || {}

  /* Bar chart — occupation par étage */
  const barData = {
    labels: floors.map(f => `Étage ${f.floor}`),
    datasets: [{
      data: floors.map(f => parseInt(f.pct || 0)),
      backgroundColor: floors.map(f => floorColor(parseInt(f.pct || 0))),
      borderRadius: 6,
      borderSkipped: false,
    }],
  }

  /* Line chart — revenus 7 jours */
  const last7  = rev.last7days || []
  const lineData = {
    labels: last7.map(d =>
      new Date(d.day).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' })
    ),
    datasets: [{
      label: 'Revenus ($)',
      data: last7.map(d => parseFloat(d.total)),
      borderColor: '#58a6ff',
      backgroundColor: 'rgba(88,166,255,0.1)',
      fill: true, tension: 0.4,
      pointBackgroundColor: '#58a6ff',
      pointRadius: 4, borderWidth: 2,
    }],
  }

  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        ticks: { color: '#8b949e', font: { size: 11 } },
        grid:  { color: '#21262d' }, border: { display: false },
      },
      x: {
        ticks: { color: '#8b949e', font: { size: 11 } },
        grid:  { display: false }, border: { display: false },
      },
    },
  }
  const barOpts  = { ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, max: 100, ticks: { ...baseOpts.scales.y.ticks, callback: v => v + '%' } } } }
  const lineOpts = { ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: v => '$' + v } } } }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue d'ensemble du parking en temps réel</p>
        </div>
        <div className="badge-active"><span className="dot-green"/>Système actif</div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-left">
            <span className="stat-label">TOTAL PLACES</span>
            <div className="stat-value">{spots.total || 100}</div>
            <div className="stat-sub">4 étages × 25 places</div>
          </div>
          <div className="stat-icon stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="#58a6ff" width="22" height="22">
              <circle cx="12" cy="12" r="10"/>
              <path fill="#0d1117" d="M9.5 7h3c1.38 0 2.5 1.12 2.5 2.5S13.88 12 12.5 12H11v3H9.5V7zm1.5 3.5h1.5c.55 0 1-.45 1-1s-.45-1-1-1H11v2z"/>
            </svg>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-left">
            <span className="stat-label">OCCUPÉES</span>
            <div className="stat-value stat-red">{spots.occupied || 0}</div>
            <div className="stat-sub stat-danger">
              {spots.total ? Math.round((spots.occupied / spots.total) * 100) : 0}% occupé
            </div>
          </div>
          <div className="stat-icon stat-icon-red">
            <svg viewBox="0 0 24 24" fill="#f85149" width="22" height="22">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
            </svg>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-left">
            <span className="stat-label">DISPONIBLES</span>
            <div className="stat-value stat-green">{spots.free || 0}</div>
            <div className="stat-sub stat-success">
              {spots.total ? Math.round((spots.free / spots.total) * 100) : 0}% disponible
            </div>
          </div>
          <div className="stat-icon stat-icon-green">
            <svg viewBox="0 0 24 24" fill="#3fb950" width="22" height="22">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-left">
            <span className="stat-label">REVENUS</span>
            <div className="stat-value stat-purple">${(rev.today || 0).toFixed(2)}</div>
            <div className="stat-sub">{data?.sessions?.today || 0} sessions aujourd'hui</div>
          </div>
          <div className="stat-icon stat-icon-purple">
            <svg viewBox="0 0 24 24" fill="#bc8cff" width="22" height="22">
              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Occupation par étage</h3>
              <p>Taux d'occupation en temps réel</p>
            </div>
            <div className="chart-legend">
              <span className="leg"><span className="leg-dot" style={{background:'#3fb950'}}/>&lt;60%</span>
              <span className="leg"><span className="leg-dot" style={{background:'#d29922'}}/>60-80%</span>
              <span className="leg"><span className="leg-dot" style={{background:'#f85149'}}/>&#62;80%</span>
            </div>
          </div>
          <div style={{height: 200}}><Bar data={barData} options={barOpts}/></div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Revenus (7 jours)</h3>
              <p>Évolution des revenus quotidiens</p>
            </div>
          </div>
          <div style={{height: 200}}><Line data={lineData} options={lineOpts}/></div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="table-card">
        <div className="table-header">
          <h3>Activité récente</h3>
          <span className="badge-count">{data?.sessions?.active || 0} actifs</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Véhicule</th><th>Conducteur</th>
                <th>Étage / Place</th><th>Entrée</th>
                <th>Statut</th><th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentActivity || []).map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="cell-main">{s.license_plate}</div>
                    <div className="cell-sub">{s.color} {s.brand} {s.model}</div>
                  </td>
                  <td>{s.prenom} {s.nom}</td>
                  <td>Étage {s.floor} — {s.zone}-{String(s.spot_number).padStart(2,'0')}</td>
                  <td>{new Date(s.entry_time).toLocaleString('fr-CA',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                  <td>
                    <span className={`pill ${s.status === 'active' ? 'pill-green' : 'pill-gray'}`}>
                      {s.status === 'active' ? 'En cours' : 'Terminé'}
                    </span>
                  </td>
                  <td className="cell-amount">
                    {s.amount ? `$${parseFloat(s.amount).toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
              {!data?.recentActivity?.length && (
                <tr><td colSpan={6} className="empty-row">Aucune activité récente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
