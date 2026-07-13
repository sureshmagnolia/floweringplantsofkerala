"use client";

import { useState, useMemo, useEffect } from 'react';
import plantsData from '../data/plants.json';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const authTime = localStorage.getItem('keralaPlantsAuthTime');
    const authPass = localStorage.getItem('keralaPlantsPassword');
    const now = new Date().getTime();
    // 24 hours = 24 * 60 * 60 * 1000 = 86400000 ms
    if (authTime && (now - parseInt(authTime) < 86400000) && authPass) {
      // Auto login with stored password
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
  const [popupType, setPopupType] = useState(null); // 'citation', 'description', 'localities'
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Search state
  const defaultSearchState = {
    textQuery: '',
    family: '',
    nameType: '', 
    plantClass: '', 
    leafType: '', 
    flowerType: '', 
    fruitType: '', 
    habit: '', 
    flowerColor: '',
    conservationStatus: '',
    habitat: '',
    districts: '',
    flags: {
      garden: false, medicinal: false, edible: false, poisonous: false,
      exotic: false, endemic: false, vegetables: false, epiphytes: false,
      saprophytes: false, stemParasites: false, rootParasites: false, weeds: false
    }
  };
  const [search, setSearch] = useState(defaultSearchState);

  const resetFilters = () => setSearch(defaultSearchState);

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

  const handleFlagChange = (flag) => {
    setSearch({
      ...search,
      flags: { ...search.flags, [flag]: !search.flags[flag] }
    });
  };

  const FLOWER_COLORS = ['White', 'Yellow', 'Red', 'Pink', 'Blue', 'Purple', 'Orange', 'Green'];
  const HABITATS = ['Evergreen', 'Deciduous', 'Sacred groves', 'Plains', 'Coastal', 'Wetlands', 'Grasslands', 'Aquatic', 'Waste lands'];
  const CONSERVATION_STATUSES = ['CR', 'EN', 'VU', 'NT', 'DD', 'EX'];

  const [familyDropdownOpen, setFamilyDropdownOpen] = useState(false);

  const uniqueFamilies = useMemo(() => {
    const families = new Set(plants.map(p => p.family).filter(Boolean));
    return Array.from(families).sort();
  }, [plants]);

  const matchingFamilies = useMemo(() => {
    if (!search.family || search.family.length < 3) return [];
    const lowerQuery = search.family.toLowerCase();
    const matches = uniqueFamilies.filter(f => f.toLowerCase().includes(lowerQuery));
    if (matches.length === 1 && matches[0].toLowerCase() === lowerQuery) return [];
    return matches;
  }, [search.family, uniqueFamilies]);

  const filteredPlants = plants.filter(p => {
    if (search.textQuery && !p.scientificName?.toLowerCase().includes(search.textQuery.toLowerCase())) return false;
    if (search.family && (!p.family || !p.family.toLowerCase().includes(search.family.toLowerCase()))) return false;
    
    if (search.plantClass && p.plantClass !== search.plantClass) return false;
    if (search.leafType && p.leafType !== search.leafType) return false;
    if (search.flowerType && p.flowerType !== search.flowerType) return false;
    if (search.fruitType && p.fruitType !== search.fruitType) return false;
    if (search.habit && p.habit !== search.habit) return false;
    
    // Dropdown filters
    if (search.conservationStatus && p.conservationStatus !== search.conservationStatus) return false;
    if (search.flowerColor && p.description && !p.description.toLowerCase().includes(search.flowerColor.toLowerCase())) return false;
    if (search.habitat && p.habitat && !p.habitat.toLowerCase().includes(search.habitat.toLowerCase())) return false;

    // Checkbox flags
    if (search.flags.garden && !p.flags.garden) return false;
    if (search.flags.medicinal && !p.flags.medicinal) return false;
    if (search.flags.edible && !p.flags.edible) return false;
    if (search.flags.poisonous && !p.flags.poisonous) return false;
    if (search.flags.exotic && !p.flags.exotic) return false;
    if (search.flags.endemic && !p.flags.endemic) return false;
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full">
          <h2 className="text-2xl font-bold mb-6 text-green-800">Kerala Plants Database</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-gray-900 bg-white"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700"
          >
            {loading ? 'Verifying...' : 'Access Database'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-200 p-8 relative">
      <div className="max-w-6xl mx-auto bg-purple-300 rounded-lg shadow-xl overflow-hidden border-2 border-purple-400">
        <div className="p-4 bg-purple-400 text-white font-bold text-lg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>🌸</span> Advanced Search
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={resetFilters} 
              className="bg-red-500 hover:bg-red-600 text-sm px-4 py-1 rounded shadow text-white transition-colors border border-red-700"
            >
              Reset Filters
            </button>
            <button 
              onClick={handleLogout} 
              className="bg-red-500 hover:bg-red-600 px-4 py-1 text-sm font-semibold rounded shadow transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row p-6 gap-6">
          
          {/* Left Column (Radio Buttons) */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div className="bg-purple-200 p-3 rounded border border-purple-400">
              <label className="font-semibold text-purple-900 block mb-2">Monocots/Dicots/Gymnosperms</label>
              <div className="flex gap-4 text-sm text-purple-900">
                <label><input type="radio" name="class" checked={search.plantClass === 'Monocots'} onChange={() => setSearch({...search, plantClass: 'Monocots'})} /> Monocots</label>
                <label><input type="radio" name="class" checked={search.plantClass === 'Dicots'} onChange={() => setSearch({...search, plantClass: 'Dicots'})} /> Dicots</label>
                <label><input type="radio" name="class" checked={search.plantClass === 'Gymnosperms'} onChange={() => setSearch({...search, plantClass: 'Gymnosperms'})} /> Gymnosperms</label>
              </div>
            </div>
            <div className="bg-purple-200 p-3 rounded border border-purple-400">
              <label className="font-semibold text-purple-900 block mb-2">Leaf type</label>
              <div className="flex gap-4 text-sm text-purple-900">
                <label><input type="radio" name="leaf" checked={search.leafType === 'Simple'} onChange={() => setSearch({...search, leafType: 'Simple'})} /> Simple</label>
                <label><input type="radio" name="leaf" checked={search.leafType === 'Compound'} onChange={() => setSearch({...search, leafType: 'Compound'})} /> Compound</label>
                <label><input type="radio" name="leaf" checked={search.leafType === 'Leafless'} onChange={() => setSearch({...search, leafType: 'Leafless'})} /> Leafless</label>
              </div>
            </div>
            <div className="bg-purple-200 p-3 rounded border border-purple-400">
              <label className="font-semibold text-purple-900 block mb-2">Flowers</label>
              <div className="flex gap-4 text-sm text-purple-900">
                <label><input type="radio" name="flower" checked={search.flowerType === 'Single'} onChange={() => setSearch({...search, flowerType: 'Single'})} /> Single</label>
                <label><input type="radio" name="flower" checked={search.flowerType === 'Group'} onChange={() => setSearch({...search, flowerType: 'Group'})} /> Group</label>
              </div>
            </div>
            <div className="bg-purple-200 p-3 rounded border border-purple-400">
              <label className="font-semibold text-purple-900 block mb-2">Fruit</label>
              <div className="flex gap-4 text-sm text-purple-900">
                <label><input type="radio" name="fruit" checked={search.fruitType === 'Fleshy'} onChange={() => setSearch({...search, fruitType: 'Fleshy'})} /> Fleshy</label>
                <label><input type="radio" name="fruit" checked={search.fruitType === 'Dry'} onChange={() => setSearch({...search, fruitType: 'Dry'})} /> Dry</label>
              </div>
            </div>
            <div className="bg-purple-200 p-3 rounded border border-purple-400">
              <label className="font-semibold text-purple-900 block mb-2">Habit</label>
              <div className="grid grid-cols-2 gap-2 text-sm text-purple-900">
                <label><input type="radio" name="habit" checked={search.habit === 'Climbers'} onChange={() => setSearch({...search, habit: 'Climbers'})} /> Climbers</label>
                <label><input type="radio" name="habit" checked={search.habit === 'Shrubs'} onChange={() => setSearch({...search, habit: 'Shrubs'})} /> Shrubs</label>
                <label><input type="radio" name="habit" checked={search.habit === 'Herbs'} onChange={() => setSearch({...search, habit: 'Herbs'})} /> Herbs</label>
                <label><input type="radio" name="habit" checked={search.habit === 'Trees'} onChange={() => setSearch({...search, habit: 'Trees'})} /> Trees</label>
              </div>
            </div>
          </div>
          
          {/* Middle Column */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div className="relative">
              <label className="text-purple-900 font-semibold mb-1 block">Family</label>
              <input 
                type="text" 
                value={search.family || ''} 
                onChange={(e) => {
                  setSearch({...search, family: e.target.value});
                  setFamilyDropdownOpen(true);
                }}
                onFocus={() => setFamilyDropdownOpen(true)}
                onBlur={() => setTimeout(() => setFamilyDropdownOpen(false), 200)}
                placeholder="Search family..."
                className="w-full p-1 rounded border border-purple-400 text-gray-900 bg-white"
              />
              {familyDropdownOpen && matchingFamilies.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-purple-400 rounded shadow-lg">
                  {matchingFamilies.map(f => (
                    <li 
                      key={f}
                      className="px-3 py-1.5 text-sm cursor-pointer hover:bg-purple-100 text-gray-900"
                      onClick={() => {
                        setSearch({...search, family: f});
                        setFamilyDropdownOpen(false);
                      }}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="text-purple-900 font-semibold mb-1 block">Flower Colour</label>
              <select 
                className="w-full p-1 rounded border border-purple-400 text-gray-900 bg-white"
                value={search.flowerColor}
                onChange={(e) => setSearch({...search, flowerColor: e.target.value})}
              >
                <option value="">Any</option>
                {FLOWER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-purple-900 font-semibold mb-1 block">Conservation Status</label>
              <select 
                className="w-full p-1 rounded border border-purple-400 text-gray-900 bg-white"
                value={search.conservationStatus}
                onChange={(e) => setSearch({...search, conservationStatus: e.target.value})}
              >
                <option value="">Any</option>
                {CONSERVATION_STATUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-purple-900 font-semibold mb-1 block">Habitat</label>
              <select 
                className="w-full p-1 rounded border border-purple-400 text-gray-900 bg-white"
                value={search.habitat}
                onChange={(e) => setSearch({...search, habitat: e.target.value})}
              >
                <option value="">Any</option>
                {HABITATS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-4 text-sm text-purple-900 font-medium">
              <label><input type="checkbox" checked={search.flags.garden} onChange={() => handleFlagChange('garden')} className="mr-2"/> Garden Plants</label>
              <label><input type="checkbox" checked={search.flags.medicinal} onChange={() => handleFlagChange('medicinal')} className="mr-2"/> Medicinal Plants</label>
              <label><input type="checkbox" checked={search.flags.edible} onChange={() => handleFlagChange('edible')} className="mr-2"/> Edible Fruits</label>
              <label><input type="checkbox" checked={search.flags.poisonous} onChange={() => handleFlagChange('poisonous')} className="mr-2"/> Poisonous Plants</label>
              <label><input type="checkbox" checked={search.flags.exotic} onChange={() => handleFlagChange('exotic')} className="mr-2"/> Exotic Plants</label>
              <label><input type="checkbox" checked={search.flags.endemic} onChange={() => handleFlagChange('endemic')} className="mr-2"/> Endemic Plants</label>
            </div>
          </div>
          
          {/* Right Column (Results) */}
          <div className="w-full md:w-1/3 bg-white rounded-md flex flex-col border border-purple-400">
            <div className="p-3 bg-purple-100 border-b border-purple-200">
              <input 
                type="text" 
                placeholder="Search species name..." 
                value={search.textQuery}
                onChange={(e) => setSearch({...search, textQuery: e.target.value})}
                className="w-full px-2 py-1 rounded border border-purple-300 text-gray-900 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="p-2 bg-purple-200 text-purple-900 font-bold text-center border-b border-purple-300 text-sm">
              SPECIES LIST ({filteredPlants.length}/{plants.length})
            </div>
            <div className="flex-1 overflow-y-auto max-h-[440px]">
              {filteredPlants.map((plant, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    setSelectedPlant(plant);
                    setCurrentImageIndex(0);
                    setPopupType(null);
                  }}
                  className="text-gray-900 text-sm hover:bg-blue-600 hover:text-white cursor-pointer px-3 py-1 border-b border-gray-100 transition-colors"
                >
                  {plant.scientificName || "Unnamed Plant"}
                </div>
              ))}
              {filteredPlants.length === 0 && (
                <div className="text-gray-400 text-center italic mt-4 text-sm">No species match the selected filters.</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* PLANT DETAILS MODAL */}
      {selectedPlant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-purple-200 rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-purple-400">
            
            {/* Header */}
            <div className="bg-red-400 text-white font-bold px-4 py-2 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span>🌺</span> Details of Plants
              </div>
              <button 
                onClick={() => setSelectedPlant(null)}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-bold shadow"
              >
                X
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-center text-purple-900 bg-white p-2 mb-4 sm:mb-6 rounded shadow-sm">
                {selectedPlant.scientificName}
              </h2>

              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                
                {/* Left Side: Details Fields */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center">
                    <span className="w-32 font-semibold text-purple-900 text-sm">Family</span>
                    <div className="flex-1 bg-white p-2 rounded text-gray-900 text-sm shadow-inner">{selectedPlant.family || 'N/A'}</div>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 font-semibold text-purple-900 text-sm">Habit</span>
                    <div className="flex-1 bg-white p-2 rounded text-gray-900 text-sm shadow-inner">{selectedPlant.habit || 'N/A'}</div>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 font-semibold text-purple-900 text-sm">Status</span>
                    <div className="flex-1 bg-white p-2 rounded text-gray-900 text-sm shadow-inner">{selectedPlant.conservationStatus || 'N/A'}</div>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 font-semibold text-purple-900 text-sm">Endemic</span>
                    <div className="flex-1 bg-white p-2 rounded text-gray-900 text-sm shadow-inner">{selectedPlant.flags?.endemic ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-32 font-semibold text-purple-900 text-sm mt-2">Flowering &<br/>Fruiting</span>
                    <div className="flex-1 bg-white p-2 rounded text-gray-900 text-sm shadow-inner min-h-[2.5rem]">{selectedPlant.phenology || 'N/A'}</div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-32 font-semibold text-purple-900 text-sm mt-2">Habitat</span>
                    <div className="flex-1 bg-white p-2 rounded text-gray-900 text-sm shadow-inner min-h-[4rem]">{selectedPlant.habitat || 'N/A'}</div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-32 font-semibold text-purple-900 text-sm mt-2">Distribution</span>
                    <div className="flex-1 bg-white p-2 rounded text-gray-900 text-sm shadow-inner min-h-[4rem]">{selectedPlant.distribution || 'N/A'}</div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-wrap gap-2 justify-center mt-auto pt-4 border-t border-purple-300">
                    <button onClick={() => setPopupType('Citation')} className="px-4 py-2 rounded font-semibold text-sm transition-colors bg-purple-100 text-purple-900 hover:bg-purple-300">Citation</button>
                    <button onClick={() => setPopupType('Description')} className="px-4 py-2 rounded font-semibold text-sm transition-colors bg-purple-100 text-purple-900 hover:bg-purple-300">Description</button>
                    <button onClick={() => setPopupType('Localities')} className="px-4 py-2 rounded font-semibold text-sm transition-colors bg-purple-100 text-purple-900 hover:bg-purple-300">Localities</button>
                    <button onClick={() => setSelectedPlant(null)} className="px-6 py-2 rounded font-bold text-sm bg-purple-100 text-purple-900 hover:bg-red-200 sm:ml-4 border border-purple-300">CLOSE</button>
                  </div>
                  
                  {/* Thumbnails */}
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2 w-full">
                    {selectedPlant.images && selectedPlant.images.length > 0 ? (
                      selectedPlant.images.map((url, i) => (
                        <button 
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`flex-shrink-0 w-16 h-12 rounded border-2 overflow-hidden relative ${currentImageIndex === i ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]' : 'border-white hover:border-purple-400'}`}
                        >
                          <img src={url.replace('https://drive.google.com/uc?id=', '/api/image?id=')} alt={`Thumbnail ${i}`} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                        </button>
                      ))
                    ) : (
                      <div className="w-full text-xs text-purple-700 italic">No images available for this species.</div>
                    )}
                  </div>
                </div>

                {/* Right Side: Big Image */}
                <div className="flex-1 w-full border-2 border-purple-900 rounded bg-black flex items-center justify-center min-h-[250px] max-h-[300px] lg:min-h-[400px] lg:max-h-[500px] relative overflow-hidden">
                  {selectedPlant.images && selectedPlant.images.length > 0 ? (
                    <img 
                      src={selectedPlant.images[currentImageIndex].replace('https://drive.google.com/uc?id=', '/api/image?id=')} 
                      alt={selectedPlant.scientificName} 
                      className="object-contain w-full h-full" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <p className="text-gray-400 italic">Image missing.</p>
                  )}
                </div>
                
              </div>
            </div>
          </div>
          
          {/* LEGACY POPUPS */}
          {popupType && (
            <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none">
              <div className="bg-[#EAE4FF] border border-blue-400 rounded-sm shadow-xl w-full max-w-3xl flex flex-col pointer-events-auto" style={{ boxShadow: '2px 2px 10px rgba(0,0,0,0.5)' }}>
                
                {/* Legacy Window Title Bar */}
                <div className="bg-[#E47B89] text-white text-xs font-bold px-2 py-1 flex justify-between items-center border-b border-white">
                  <div className="flex items-center gap-1 uppercase">
                    <span>🌸</span> {popupType}
                  </div>
                  <button onClick={() => setPopupType(null)} className="bg-[#D35A6A] hover:bg-red-700 px-2 rounded-sm border border-white text-xs">X</button>
                </div>
                
                {/* Content Area */}
                <div className="p-2">
                  <div className="bg-white p-4 border border-gray-300 overflow-y-auto h-[400px] text-sm text-gray-900 whitespace-pre-wrap">
                    {popupType === 'Citation' && (selectedPlant.citation || 'No citation available.')}
                    {popupType === 'Description' && (selectedPlant.description || 'No description available.')}
                    {popupType === 'Localities' && (
                       <div className="flex flex-col h-full items-center justify-center">
                         <p className="font-bold mb-4 text-blue-800 text-lg">DISTRIBUTION MAP</p>
                         <p className="italic text-center mb-4 px-4">{selectedPlant.districts || 'No locality data available.'}</p>
                         <div className="w-3/4 flex-1 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 p-4 text-center">
                           Since a static map image of Kerala is not included in the web app yet, the districts are listed above. If you have the "kerala_map.jpg", we can overlay these districts on it!
                         </div>
                       </div>
                    )}
                  </div>
                </div>

                {/* Footer Close Button */}
                <div className="flex justify-center p-2 bg-[#D1CAFF] border-t border-white">
                  <button onClick={() => setPopupType(null)} className="px-6 py-1 bg-[#EAE4FF] border border-gray-400 rounded-sm text-blue-900 text-sm hover:bg-white transition-colors">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
