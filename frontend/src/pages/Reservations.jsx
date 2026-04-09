import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ vehicle_id: '', start_time: '', end_time: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReservations();
    fetchVehicles();
  }, []);

  const fetchReservations = async () => {
    try {
      const res = await api.get('/reservations');
      setReservations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reservations', form);
      setForm({ vehicle_id: '', start_time: '', end_time: '' });
      fetchReservations();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Réservations</h1>
      <div className="card mb-4">
        <h2 className="text-xl mb-2">Réserver une place</h2>
        {error && <p className="text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select className="input" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} required>
            <option value="">Choisir véhicule</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate}</option>)}
          </select>
          <input type="datetime-local" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
          <input type="datetime-local" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
          <button type="submit" className="btn btn-primary">Réserver</button>
        </form>
      </div>
      <div className="card">
        <h2 className="text-xl mb-2">Mes réservations</h2>
        <table className="table">
          <thead>
            <tr><th>ID</th><th>Véhicule</th><th>Début</th><th>Fin</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {reservations.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.vehicle_id}</td>
                <td>{new Date(r.start_time).toLocaleString()}</td>
                <td>{new Date(r.end_time).toLocaleString()}</td>
                <td>{r.status}</td>
              </tr>
            ))}
            {reservations.length === 0 && <tr><td colSpan="5" className="text-center">Aucune réservation</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}