"use client";

import { useState, useEffect } from 'react';
import ModernUI from '../components/ModernUI';
import { Capacitor } from '@capacitor/core';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [plants, setPlants] = useState([]);

  // Android Offline Data State
  const [isOfflineDataReady, setIsOfflineDataReady] = useState(false);
  const [checkingData, setCheckingData] = useState(typeof window !== 'undefined' ? Capacitor.isNativePlatform() : false);

  const checkPasswordLocally = (pass) => {
    const formatter = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
    const parts = formatter.formatToParts(new Date());
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    const basePassword = `${day}${month}${year}`;
    const expectedPassword = basePassword.split('').reverse().join('');
    return pass === expectedPassword;
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      fetch('/data/android_plants.json')
        .then(res => res.json())
        .then(data => {
          setPlants(data);
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
        })
        .catch(err => {
          console.error("Failed to load local DB", err);
          setIsCheckingAuth(false);
        });
      return;
    }

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
      })
      .finally(() => setIsCheckingAuth(false));
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (Capacitor.isNativePlatform()) {
        if (checkPasswordLocally(password)) {
          const res = await fetch('/data/android_plants.json');
          const data = await res.json();
          setPlants(data);
          setIsAuthenticated(true);
          localStorage.setItem('keralaPlantsAuthTime', new Date().getTime().toString());
          localStorage.setItem('keralaPlantsPassword', password);
        } else {
          setError("Incorrect password");
        }
      } else {
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

  // Check if offline data exists on Android
  useEffect(() => {
    if (isAuthenticated && Capacitor.isNativePlatform()) {
      import('../lib/offlineManager').then(({ OfflineDataManager }) => {
        OfflineDataManager.checkExists().then(res => {
          setIsOfflineDataReady(res.exists);
          setCheckingData(false);
        }).catch(err => {
          console.error(err);
          setCheckingData(false);
        });
      });
    }
  }, [isAuthenticated]);

  const handleDownloadOfflineData = () => {
    import('../lib/offlineManager').then(({ OfflineDataManager }) => {
      // Direct link to the zip on Hugging Face (assuming it's public)
      OfflineDataManager.startDownload({ url: 'https://huggingface.co/datasets/sureshmagnolia/kerala-plants-images/resolve/main/images.zip?download=true' }).then(() => {
        alert('Download started in background. Please wait for the notification, then refresh the app.');
      }).catch(err => alert(err));
    });
  };

  const handleCheckDownload = () => {
    import('../lib/offlineManager').then(({ OfflineDataManager }) => {
      OfflineDataManager.checkExists().then(res => {
        if (res.exists) {
          setIsOfflineDataReady(true);
          alert('Dataset ready!');
        } else {
          alert('Dataset is still downloading. Please wait.');
        }
      }).catch(err => alert(err));
    });
  };

  if (isCheckingAuth || checkingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-emerald-600 font-semibold animate-pulse">Loading...</div>
      </div>
    );
  }

  // Show offline data download screen if native and data not ready
  if (Capacitor.isNativePlatform() && !isOfflineDataReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-sm w-full">
           <h2 className="text-xl font-bold text-slate-900 mb-4">Offline Dataset Required</h2>
           <p className="text-sm text-slate-600 mb-6">
             To use Kerala Plants offline, you must download the images dataset (approx. 2 GB) once. 
             This dataset will be stored internally and not shown in your device's gallery.
           </p>
           <button 
             onClick={handleDownloadOfflineData}
             className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg mb-4"
           >
             Download Dataset Now
           </button>
           <button 
             onClick={handleCheckDownload}
             className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2.5 px-4 rounded-lg"
           >
             I have downloaded it, check again
           </button>
        </div>
      </div>
    );
  }

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



  const isNative = typeof window !== 'undefined' ? Capacitor.isNativePlatform() : false;

  return (
    <ModernUI plants={plants} handleLogout={handleLogout} isNative={isNative} />
  );
}
