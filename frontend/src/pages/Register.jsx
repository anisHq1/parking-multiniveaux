import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(email, password, fullName, phone);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || "Erreur d'inscription");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Inscription</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input type="email" placeholder="Email" className="input mb-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Mot de passe" className="input mb-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input type="text" placeholder="Nom complet" className="input mb-2" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input type="tel" placeholder="Téléphone" className="input mb-4" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button type="submit" className="btn btn-primary w-full">S'inscrire</button>
        <p className="mt-4 text-center">Déjà un compte ? <a href="/login" className="text-primary">Connexion</a></p>
      </form>
    </div>
  );
}