import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ license_plate: '', model: '', color: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

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
      await api.post('/vehicles', form);
      setForm({ license_plate: '', model: '', color: '' });
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Véhicules</h1>
      <div className="card mb-4">
        <h2 className="text-xl font-bold mb-2">Ajouter un véhicule</h2>
        {error && <p className="text-danger mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input type="text" placeholder="Plaque (ex: AB-123-CD)" className="input" value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} required />
          <input type="text" placeholder="Modèle" className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <input type="text" placeholder="Couleur" className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <button type="submit" className="btn btn-primary">Ajouter</button>
        </form>
      </div>
      <div className="card">
        <h2 className="text-xl font-bold mb-2">Mes véhicules</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Plaque</th><th>Modèle</th><th>Couleur</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td className="font-bold">{v.license_plate}</td>
                  <td>{v.model || '-'}</td>
                  <td>{v.color || '-'}</td>
                  <td><span className="badge badge-success">Garé</span></td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td colSpan="4" className="text-center">Aucun véhicule</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}