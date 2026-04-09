import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="p-4 border-bottom">
        <h2 className="text-xl font-bold">ParkFlow</h2>
        <p className="text-sm text-gray-500">Smart Parking</p>
      </div>
      <nav className="p-2">
        <ul>
          <li><Link to="/dashboard" className="block p-2 rounded hover-bg-gray-100">Dashboard</Link></li>
          <li><Link to="/parking-plan" className="block p-2 rounded hover-bg-gray-100">Plan Parking</Link></li>
          <li><Link to="/vehicles" className="block p-2 rounded hover-bg-gray-100">Véhicules</Link></li>
          <li><Link to="/reservations" className="block p-2 rounded hover-bg-gray-100">Réservations</Link></li>
          {user?.role === 'admin' && (
            <li><Link to="/admin/spots" className="block p-2 rounded hover-bg-gray-100">Gestion Places</Link></li>
          )}
        </ul>
      </nav>
      <div className="absolute bottom-0 w-full p-4 border-top">
        <button onClick={handleLogout} className="btn btn-secondary w-full">Déconnexion</button>
      </div>
    </aside>
  );
}