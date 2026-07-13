"use client";

import { useState, useMemo, useEffect } from 'react';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const authTime = localStorage.getItem('keralaPlantsAuthTime');
    const authPass = localStorage.getItem('keralaPlantsPassword');
    const now = new Date().getTime();
    if (authTime && (now - parseInt(authTime) < 86400000) && authPass) {
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
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [plants, setPlants] = useState([]);
  
  // Modal state
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const getImageUrl = (url) => {
    if (!url) return '';
    const idMatch = url.match(/id=([^&]+)/) || url.match(/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch) {
      return `/api/image?id=${idMatch[1]}`;
    }
    return url;
  };

  // Search state
  const defaultSearchState = {
    textQuery: '',
    nameType: '', 
    plantClass: '', 
    leafType: '', 
    flowerType: '', 
    fruitType: '', 
    habit: '', 
    flowerColor: '',
    conservationStatus: '',
    habitat: '',
    flags: {
      garden: false, medicinal: false, edible: false, poisonous: false,
      exotic: false, endemic: false
    }
  };
  const [search, setSearch] = useState(defaultSearchState);

  const resetFilters = () => setSearch(defaultSearchState);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const hasActiveFilter = useMemo(() => {
    if (search.textQuery.trim().length >= 3) return true;
    if (search.plantClass || search.leafType || search.flowerType || search.fruitType || search.habit || search.flowerColor || search.conservationStatus || search.habitat) return true;
    if (Object.values(search.flags).some(v => v === true)) return true;
    return false;
  }, [search]);

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

  const handleFlagChange = (flag) => {
    setSearch({
      ...search,
      flags: { ...search.flags, [flag]: !search.flags[flag] }
    });
  };

  const FLOWER_COLORS = ['White', 'Yellow', 'Red', 'Pink', 'Blue', 'Purple', 'Orange', 'Green'];
  const HABITATS = ['Evergreen', 'Deciduous', 'Sacred groves', 'Plains', 'Coastal', 'Wetlands', 'Grasslands', 'Aquatic', 'Waste lands'];
  const CONSERVATION_STATUSES = ['CR', 'EN', 'VU', 'NT', 'DD', 'EX'];

  const filteredPlants = useMemo(() => {
    return plants.filter(p => {
      if (search.textQuery && !p.scientificName?.toLowerCase().includes(search.textQuery.toLowerCase())) return false;
      
      if (search.plantClass && p.plantClass !== search.plantClass) return false;
      if (search.leafType && p.leafType !== search.leafType) return false;
      if (search.flowerType && p.flowerType !== search.flowerType) return false;
      if (search.fruitType && p.fruitType !== search.fruitType) return false;
      if (search.habit && p.habit !== search.habit) return false;
      
      if (search.conservationStatus && p.conservationStatus !== search.conservationStatus) return false;
      if (search.flowerColor && p.description && !p.description.toLowerCase().includes(search.flowerColor.toLowerCase())) return false;
      if (search.habitat && p.habitat && !p.habitat.toLowerCase().includes(search.habitat.toLowerCase())) return false;
  
      if (search.flags.garden && !p.flags.garden) return false;
      if (search.flags.medicinal && !p.flags.medicinal) return false;
      if (search.flags.edible && !p.flags.edible) return false;
      if (search.flags.poisonous && !p.flags.poisonous) return false;
      if (search.flags.exotic && !p.flags.exotic) return false;
      if (search.flags.endemic && !p.flags.endemic) return false;
      return true;
    });
  }, [plants, search]);

  const paginatedPlants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPlants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPlants, currentPage]);

  const totalPages = Math.ceil(filteredPlants.length / itemsPerPage);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
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
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              placeholder="Enter password..."
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center font-medium">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Access Database'}
          </button>
        </form>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm transition-all appearance-none";
  const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white tracking-tight">
            <span className="text-2xl">🌿</span> Kerala Plants
          </h1>
          <div className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full uppercase tracking-wider">
            {filteredPlants.length} Species
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar / Filters */}
          <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-slate-800 dark:text-slate-200">Filters</h2>
                <button 
                  onClick={resetFilters} 
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold transition-colors"
                >
                  Reset All
                </button>
              </div>

              <div className="space-y-4">
                {/* Search */}
                <div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search scientific name..." 
                      value={search.textQuery}
                      onChange={(e) => setSearch({...search, textQuery: e.target.value})}
                      className={`pl-9 ${inputClass}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Family</label>
                  <input 
                    type="text" 
                    value={search.family || ''} 
                    onChange={(e) => setSearch({...search, family: e.target.value})}
                    placeholder="Search family..."
                    className={inputClass}
                  />
                </div>
                
                <div>
                  <label className={labelClass}>Class</label>
                  <select className={inputClass} value={search.plantClass} onChange={(e) => setSearch({...search, plantClass: e.target.value})}>
                    <option value="">Any</option><option value="Monocots">Monocots</option><option value="Dicots">Dicots</option><option value="Gymnosperms">Gymnosperms</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Leaf</label>
                    <select className={inputClass} value={search.leafType} onChange={(e) => setSearch({...search, leafType: e.target.value})}>
                      <option value="">Any</option><option value="Simple">Simple</option><option value="Compound">Compound</option><option value="Leafless">Leafless</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Flower</label>
                    <select className={inputClass} value={search.flowerType} onChange={(e) => setSearch({...search, flowerType: e.target.value})}>
                      <option value="">Any</option><option value="Single">Single</option><option value="Group">Group</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Fruit</label>
                    <select className={inputClass} value={search.fruitType} onChange={(e) => setSearch({...search, fruitType: e.target.value})}>
                      <option value="">Any</option><option value="Fleshy">Fleshy</option><option value="Dry">Dry</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Habit</label>
                    <select className={inputClass} value={search.habit} onChange={(e) => setSearch({...search, habit: e.target.value})}>
                      <option value="">Any</option><option value="Tree">Tree</option><option value="Shrub">Shrub</option><option value="Herb">Herb</option><option value="Climber">Climber</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Color</label>
                  <select className={inputClass} value={search.flowerColor} onChange={(e) => setSearch({...search, flowerColor: e.target.value})}>
                    <option value="">Any</option>
                    {FLOWER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Habitat</label>
                  <select className={inputClass} value={search.habitat} onChange={(e) => setSearch({...search, habitat: e.target.value})}>
                    <option value="">Any</option>
                    {HABITATS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Conservation</label>
                  <select className={inputClass} value={search.conservationStatus} onChange={(e) => setSearch({...search, conservationStatus: e.target.value})}>
                    <option value="">Any</option>
                    {CONSERVATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Flags/Properties */}
                <div className="pt-2">
                  <label className={labelClass}>Properties</label>
                  <div className="flex flex-col gap-2 mt-2">
                    {[
                      { key: 'endemic', label: 'Endemic', color: 'blue' },
                      { key: 'medicinal', label: 'Medicinal', color: 'emerald' },
                      { key: 'poisonous', label: 'Poisonous', color: 'red' },
                      { key: 'edible', label: 'Edible', color: 'orange' },
                      { key: 'garden', label: 'Garden', color: 'purple' },
                      { key: 'exotic', label: 'Exotic', color: 'indigo' },
                    ].map((config) => (
                      <label key={config.key} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={search.flags[config.key]}
                            onChange={(e) => setSearch({
                              ...search,
                              flags: {...search.flags, [config.key]: e.target.checked}
                            })}
                            className="peer sr-only"
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${search.flags[config.key] ? `bg-${config.color}-500 border-${config.color}-500` : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                            {search.flags[config.key] && <span className="text-white text-[10px]">✓</span>}
                          </div>
                        </div>
                        <span className={`text-sm font-medium ${search.flags[config.key] ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>{config.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main List */}
          <div className="flex-1 flex flex-col h-[800px] lg:h-[calc(100vh-6rem)]">
            
            {/* List Body */}
            <div className="flex-1 overflow-y-auto pb-4">
              {hasActiveFilter ? (
                filteredPlants.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedPlants.map((plant, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setSelectedPlant(plant);
                          setCurrentImageIndex(0);
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col group"
                      >
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                          {plant.scientificName}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 truncate">
                          {plant.family}
                        </p>
                        
                        <div className="mt-auto flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                            {plant.habit || 'Unknown Habit'}
                          </span>
                          {plant.conservationStatus && (
                            <span className="text-[10px] font-semibold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">
                              {plant.conservationStatus}
                            </span>
                          )}
                          {plant.flags.endemic && (
                            <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">Endemic</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                      🔍
                    </div>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">No plants found</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters or search term.</p>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                    🌱
                  </div>
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Ready to explore</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Enter at least 3 characters or select a filter to view plants.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {hasActiveFilter && filteredPlants.length > 0 && (
              <div className="py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Showing <span className="text-slate-900 dark:text-white font-bold">{Math.min(filteredPlants.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="text-slate-900 dark:text-white font-bold">{Math.min(filteredPlants.length, currentPage * itemsPerPage)}</span> of <span className="text-slate-900 dark:text-white font-bold">{filteredPlants.length}</span>
                </span>
                
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Plant Details Modal */}
      {selectedPlant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate pr-4">
                  {selectedPlant.scientificName}
                </h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {selectedPlant.family}
                </p>
              </div>
              <button 
                onClick={() => setSelectedPlant(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              
              {/* Image Gallery */}
              {selectedPlant.images && selectedPlant.images.length > 0 && (
                <div className="mb-6 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 relative group aspect-video flex items-center justify-center">
                  <img 
                    src={getImageUrl(selectedPlant.images[currentImageIndex])} 
                    alt={selectedPlant.scientificName} 
                    className="max-w-full max-h-full object-contain cursor-zoom-in transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onClick={() => setFullscreenImage(getImageUrl(selectedPlant.images[currentImageIndex]))}
                  />
                  
                  {/* Gallery Controls */}
                  {selectedPlant.images.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(prev => prev === 0 ? selectedPlant.images.length - 1 : prev - 1);
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-md"
                      >
                        ←
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(prev => prev === selectedPlant.images.length - 1 ? 0 : prev + 1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-md"
                      >
                        →
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-md px-2 py-1 rounded-full">
                        {selectedPlant.images.map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Family", value: selectedPlant.family },
                  { label: "Vernacular Name", value: selectedPlant.vernacularName },
                  { label: "Habit", value: selectedPlant.habit },
                  { label: "Class", value: selectedPlant.plantClass },
                  { label: "Leaf Type", value: selectedPlant.leafType },
                  { label: "Flower Type", value: selectedPlant.flowerType },
                  { label: "Fruit Type", value: selectedPlant.fruitType },
                  { label: "Habitat", value: selectedPlant.habitat },
                  { label: "Flowering & Fruiting", value: selectedPlant.phenology },
                  { label: "Distribution", value: selectedPlant.distribution },
                  { label: "Localities", value: selectedPlant.districts },
                  { label: "Status", value: selectedPlant.conservationStatus }
                ].map((item, idx) => item.value && (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{item.label}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Properties / Flags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { key: 'endemic', label: 'Endemic', color: 'blue' },
                  { key: 'medicinal', label: 'Medicinal', color: 'emerald' },
                  { key: 'poisonous', label: 'Poisonous', color: 'red' },
                  { key: 'edible', label: 'Edible', color: 'orange' },
                  { key: 'garden', label: 'Garden', color: 'purple' },
                  { key: 'exotic', label: 'Exotic', color: 'indigo' },
                ].filter(flag => selectedPlant.flags?.[flag.key]).map((flag) => (
                  <span 
                    key={flag.key} 
                    className={`text-xs font-bold px-2.5 py-1 rounded-md border bg-${flag.color}-50 dark:bg-${flag.color}-900/20 text-${flag.color}-700 dark:text-${flag.color}-400 border-${flag.color}-200 dark:border-${flag.color}-800/50`}
                  >
                    {flag.label}
                  </span>
                ))}
              </div>

              {/* Citation */}
              {selectedPlant.citation && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Citation</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30 italic">
                    {selectedPlant.citation}
                  </p>
                </div>
              )}

              {/* Description */}
              {selectedPlant.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Description</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    {selectedPlant.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Overlay */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
          onClick={() => {
            setFullscreenImage(null);
            setIsZoomed(false);
          }}
        >
          <button 
            className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[70]"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
              setIsZoomed(false);
            }}
          >
            ✕
          </button>

          <div 
            className={`relative transition-all duration-300 ease-in-out cursor-pointer ${isZoomed ? 'w-full h-full' : 'max-w-full max-h-full'}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
            style={{
              width: isZoomed ? '100vw' : 'auto',
              height: isZoomed ? '100vh' : 'auto',
            }}
          >
            <div className={`w-full h-full ${isZoomed ? 'overflow-auto flex items-center justify-center' : 'flex items-center justify-center'}`}>
              <img 
                src={fullscreenImage} 
                alt="Fullscreen view" 
                className={`transition-all duration-300 ${isZoomed ? 'max-w-none scale-150 cursor-zoom-out' : 'max-w-full max-h-[100vh] object-contain cursor-zoom-in'}`}
                referrerPolicy="no-referrer"
                style={{
                  maxWidth: isZoomed ? '200vw' : '100%',
                  maxHeight: isZoomed ? '200vh' : '100%',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
