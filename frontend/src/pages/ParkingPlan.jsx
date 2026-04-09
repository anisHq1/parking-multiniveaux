import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ParkingPlan() {
  const [floors, setFloors] = useState([]);
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    // Simulation – à remplacer par api.get('/parking-spots')
    const mockSpots = [];
    for (let f = 1; f <= 4; f++) {
      for (let i = 1; i <= 29; i++) {
        mockSpots.push({
          id: `${f}-${i}`,
          spot_number: `${String.fromCharCode(64+f)}-${String(i).padStart(2,'0')}`,
          floor_id: f,
          status: i % 3 === 0 ? 'occupied' : (i % 5 === 0 ? 'reserved' : 'free'),
          zone: `Zone ${String.fromCharCode(64+f)}`
        });
      }
    }
    setSpots(mockSpots);
    setFloors([1,2,3,4]);
  }, []);

  const getStatusClass = (status) => {
    switch(status) {
      case 'free': return 'free';
      case 'occupied': return 'occupied';
      case 'reserved': return 'reserved';
      default: return 'free';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Plan du parking</h1>
      {floors.map(floorNum => (
        <div key={floorNum} className="card mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Étage {floorNum}</h2>
            <div className="text-sm text-gray-500">
              {spots.filter(s => s.floor_id === floorNum && s.status === 'free').length} / {spots.filter(s => s.floor_id === floorNum).length} libres
            </div>
          </div>
          <div className="parking-grid">
            {spots.filter(s => s.floor_id === floorNum).map(spot => (
              <div key={spot.id} className={`parking-spot ${getStatusClass(spot.status)}`}>
                {spot.spot_number}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}