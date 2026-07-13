"use client";

import { useState, useEffect } from 'react';
import ModernUI from '../components/ModernUI';
import LegacyUI from '../components/LegacyUI';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [plants, setPlants] = useState([]);
  
  const [isModern, setIsModern] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const authTime = localStorage.getItem('keralaPlantsAuthTime');
    const authPass = localStorage.getItem('keralaPlantsPassword');
    const now = new Date().getTime();
    if (authTime && (now - parseInt(authTime, 10) < 86400000) && authPass) {
      fetch('/api/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: authPass })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlants(data.data);
          setIsAuthenticated(true);
        }
      });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (data.success) {
        setPlants(data.data);
        setIsAuthenticated(true);
        localStorage.setItem('keralaPlantsAuthTime', new Date().getTime().toString());
        localStorage.setItem('keralaPlantsPassword', password);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('keralaPlantsAuthTime');
    localStorage.removeItem('keralaPlantsPassword');
    setIsAuthenticated(false);
    setPlants([]);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans text-slate-900 dark:text-slate-100 selection:bg-emerald-200">
        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 max-w-sm w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Kerala Plants</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to access the database</p>
          </div>
          <div className="mb-6">
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-all"
              placeholder="Enter password"
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 font-medium">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {isModern ? (
        <ModernUI plants={plants} handleLogout={handleLogout} isModern={isModern} setIsModern={setIsModern} />
      ) : (
        <LegacyUI plants={plants} handleLogout={handleLogout} isModern={isModern} setIsModern={setIsModern} />
      )}
    </>
  );
}
