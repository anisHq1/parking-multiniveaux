import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSpots: 116,
    occupied: 27,
    free: 86,
    revenue: 170,
    evolution: '+23%'
  });

  useEffect(() => {
    // Appel API futur
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tableau de bord</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total places</h3>
          <div className="stat-value">{stats.totalSpots}</div>
          <div className="stat-change">4 étages</div>
        </div>
        <div className="stat-card">
          <h3>Occupées</h3>
          <div className="stat-value">{stats.occupied}</div>
          <div className="stat-change positive">↑ 23% vs hier</div>
        </div>
        <div className="stat-card">
          <h3>Disponibles</h3>
          <div className="stat-value">{stats.free}</div>
          <div className="stat-change">{stats.revenue} DH</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-xl font-bold mb-2">Occupation par étage</h2>
          {[1,2,3,4].map(floor => (
            <div key={floor} className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Étage {floor}</span>
                <span>65%</span>
              </div>
              <div className="occupancy-bar">
                <div className="occupancy-fill" style={{ width: '65%' }}></div>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="text-xl font-bold mb-2">Revenus (7 jours)</h2>
          <div className="text-center text-gray-500">Graphique à implémenter</div>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="text-xl mb-2">Bienvenue, {user?.email}</h2>
        <p>Ceci est votre tableau de bord ParkFlow.</p>
      </div>
    </div>
  );
}