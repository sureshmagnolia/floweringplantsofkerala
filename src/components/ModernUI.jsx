"use client";

import React, { useState, useMemo, useEffect, useRef, useDeferredValue, forwardRef } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';

import { Capacitor } from '@capacitor/core';

const BINOMIAL_REGEX = /(?:^|\r?\n)([A-Z][a-z]+(?:\s+[a-z-]+(?:\s+(?:var\.|subsp\.|ssp\.|f\.)\s+[a-z-]+)?)?)/g;

const formatCitationText = (citation) => {
  if (!citation) return null;
  
  const lines = citation.split(/\r?\n/).filter(line => line.trim() !== '');
  
  return lines.map((line, index) => {
    let formatted = line.replace(/^(\s*)([A-Z][a-z-]+(?:\s+[x×])?\s+[a-z-]+)/, '$1<i>$2</i>');
    formatted = formatted.replace(/(\b(?:var\.|subsp\.|ssp\.|f\.|forma)\s+)([a-z-]+)/g, '$1<i>$2</i>');
    
    return (
      <span key={index} className="block mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: formatted }} />
    );
  });
};

const ImageWithLoading = ({ src, alt, className, imgClassName, referrerPolicy, onClick, style }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [actualSrc, setActualSrc] = useState(null);

  useEffect(() => { 
    setIsLoading(true); 
    if (Capacitor.isNativePlatform() && src && !src.startsWith('http') && !src.startsWith('/api')) {
      import('../lib/offlineManager').then(({ OfflineDataManager }) => {
        OfflineDataManager.getImage({ filename: src }).then(res => {
          setActualSrc(res.data);
        }).catch(err => {
          console.error("Offline image load error:", err);
          setActualSrc(src); // Fallback
        });
      });
    } else {
      setActualSrc(src);
    }
  }, [src]);

  return (
    <div className={`relative flex items-center justify-center ${className || ''}`} onClick={onClick}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-sm text-slate-200 font-medium animate-pulse bg-black/60 px-3 py-1 rounded-full">Loading...</span>
        </div>
      )}
      {actualSrc && <img
        src={actualSrc}
        alt={alt}
        className={`${imgClassName || ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        referrerPolicy={referrerPolicy}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        style={style}
      />}
    </div>
  );
};

export default function ModernUI({ plants, handleLogout, isNative }) {
  
  // Modal state
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let listener = null;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('backButton', () => {
          if (fullscreenImage) {
            setFullscreenImage(null);
            setIsZoomed(false);
          } else if (selectedPlant) {
            setSelectedPlant(null);
          } else {
            App.exitApp();
          }
        }).then(l => { listener = l; });
      }).catch(err => console.error("Failed to load Capacitor App plugin", err));
    }
    return () => {
      if (listener) listener.remove();
    };
  }, [fullscreenImage, selectedPlant]);
  
  const scrollToTop = () => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    searchVernacular: false,
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
  const deferredSearch = useDeferredValue(search);

  const resetFilters = () => setSearch(defaultSearchState);

  // Pagination removed

  const hasActiveFilter = useMemo(() => {
    if (deferredSearch.textQuery.trim().length >= 3) return true;
    if (deferredSearch.family && deferredSearch.family.trim().length > 0) return true;
    if (deferredSearch.plantClass || deferredSearch.leafType || deferredSearch.flowerType || deferredSearch.fruitType || deferredSearch.habit || deferredSearch.flowerColor || deferredSearch.conservationStatus || deferredSearch.habitat) return true;
    if (Object.values(deferredSearch.flags).some(v => v === true)) return true;
    return false;
  }, [deferredSearch]);


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
    if (!deferredSearch.family || deferredSearch.family.length < 3) return [];
    const lowerQuery = deferredSearch.family.toLowerCase();
    const matches = uniqueFamilies.filter(f => f.toLowerCase().includes(lowerQuery));
    if (matches.length === 1 && matches[0].toLowerCase() === lowerQuery) return [];
    return matches;
  }, [deferredSearch.family, uniqueFamilies]);

  const filteredPlants = useMemo(() => {
    return plants.filter(p => {
      if (deferredSearch.textQuery) {
        const query = deferredSearch.textQuery.toLowerCase();
        if (deferredSearch.searchVernacular) {
          if (!p.vernacularName?.toLowerCase().includes(query)) return false;
        } else {
          let matched = p.scientificName?.toLowerCase().includes(query);
          if (!matched && p.citation) {
            const citationMatches = [...p.citation.matchAll(BINOMIAL_REGEX)];
            matched = citationMatches.some(m => m[1] && m[1].toLowerCase().includes(query));
          }
          if (!matched) return false;
        }
      }
      
      if (deferredSearch.family && (!p.family || !p.family.toLowerCase().includes(deferredSearch.family.toLowerCase()))) return false;
      
      if (deferredSearch.plantClass && p.plantClass !== deferredSearch.plantClass) return false;
      if (deferredSearch.leafType && p.leafType !== deferredSearch.leafType) return false;
      if (deferredSearch.flowerType && p.flowerType !== deferredSearch.flowerType) return false;
      if (deferredSearch.fruitType && p.fruitType !== deferredSearch.fruitType) return false;
      if (deferredSearch.habit && p.habit !== deferredSearch.habit) return false;
      
      if (deferredSearch.flowerColor && (!p.description || !p.description.toLowerCase().includes(deferredSearch.flowerColor.toLowerCase()))) return false;
      if (deferredSearch.conservationStatus && (!p.conservationStatus || !p.conservationStatus.includes(deferredSearch.conservationStatus))) return false;
      if (deferredSearch.habitat && (!p.habitat || !p.habitat.toLowerCase().includes(deferredSearch.habitat.toLowerCase()))) return false;
  
      for (const [flag, isSet] of Object.entries(deferredSearch.flags)) {
        if (isSet && !p.flags?.[flag]) return false;
      }
      return true;
    });
  }, [plants, deferredSearch]);

  // Pagination removed, using Virtualization

  const inputClass = "w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm transition-all appearance-none";
  const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto min-h-[4rem] py-2 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-1 sm:gap-2 text-slate-900 dark:text-white tracking-tight">
            <span className="text-xl sm:text-2xl">🌿</span> <span className="hidden xs:inline sm:inline">Kerala Plants</span>
          </h1>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
            <div className="text-[10px] sm:text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 sm:px-3 py-1 rounded-full uppercase tracking-wider">
              {filteredPlants.length} <span className="hidden sm:inline">Species</span>
            </div>
            
            {!isNative && (
              <button
                onClick={handleLogout}
                className="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors uppercase tracking-wider ml-1 sm:ml-0"
              >
                Logout
              </button>
            )}
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
                <div className="relative">
                  <label className={labelClass}>Family</label>
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
                    className={inputClass}
                  />
                  {familyDropdownOpen && matchingFamilies.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                      {matchingFamilies.map(f => (
                        <li 
                          key={f}
                          className="px-4 py-2 text-sm cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200"
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
                      { key: 'endemic', label: 'Endemic', style: 'bg-blue-600 border-blue-600' },
                      { key: 'medicinal', label: 'Medicinal', style: 'bg-emerald-600 border-emerald-600' },
                      { key: 'poisonous', label: 'Poisonous', style: 'bg-red-600 border-red-600' },
                      { key: 'edible', label: 'Edible', style: 'bg-orange-600 border-orange-600' },
                      { key: 'garden', label: 'Garden', style: 'bg-purple-600 border-purple-600' },
                      { key: 'exotic', label: 'Exotic', style: 'bg-indigo-600 border-indigo-600' },
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
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${search.flags[config.key] ? config.style : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
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
            
            {/* Search Bar - Moved above grid */}
            <div className="mb-6">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                <input 
                  type="text" 
                  placeholder={search.searchVernacular ? "Search vernacular name..." : "Search scientific name..."}
                  value={search.textQuery}
                  onChange={(e) => setSearch({...search, textQuery: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-base"
                />
              </div>
              <label className="flex items-center gap-2 mt-3 ml-2 cursor-pointer w-fit group">
                <input 
                  type="checkbox" 
                  checked={search.searchVernacular}
                  onChange={(e) => setSearch({...search, searchVernacular: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:border-slate-600 cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                  Search by Vernacular Name
                </span>
              </label>
            </div>

            {/* List Body */}
            <div 
              ref={listRef}
              onScroll={(e) => setShowScrollTop(e.target.scrollTop > 400)}
              className="flex-1 overflow-y-auto pb-4 relative"
            >
              {hasActiveFilter ? (
                filteredPlants.length > 0 ? (
                  <VirtuosoGrid
                    style={{ height: '100%', minHeight: '400px' }}
                    data={filteredPlants}
                    components={{
                      List: forwardRef(function GridList({ style, children, ...props }, ref) {
                        return (
                          <div ref={ref} {...props} style={style} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                            {children}
                          </div>
                        );
                      })
                    }}
                    itemContent={(i, plant) => (
                      <div 
                        key={plant.id || i}
                        onClick={() => {
                          setSelectedPlant(plant);
                          setCurrentImageIndex(0);
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col group overflow-hidden h-full"
                      >
                        {plant.images && plant.images.length > 0 ? (
                          <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0">
                            <ImageWithLoading 
                              src={getImageUrl(plant.images[0])} 
                              alt={plant.scientificName}
                              className="w-full h-full"
                              imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <span className="text-4xl opacity-20">🌿</span>
                          </div>
                        )}
                        <div className="p-4 flex flex-col flex-1">
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
                      </div>
                    )}
                  />
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
            <div className="flex items-start justify-between p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white break-words">
                  {selectedPlant.scientificName}
                </h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 break-words mt-1">
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
                  <ImageWithLoading 
                    src={getImageUrl(selectedPlant.images[currentImageIndex])} 
                    alt={selectedPlant.scientificName}
                    className="w-full h-full cursor-zoom-in"
                    imgClassName="max-w-full max-h-full object-contain transition-transform duration-300"
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
                  { label: "Localities", value: selectedPlant.districts }
                ].map((item, idx) => item.value && (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{item.label}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Properties / Flags & Conservation */}
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                {selectedPlant.conservationStatus && (() => {
                  const status = selectedPlant.conservationStatus.trim();
                  let styles = "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600";
                  
                  if (status === 'CR' || status.includes('Critically Endangered')) {
                    styles = "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800";
                  } else if (status === 'EN' || status.includes('Endangered')) {
                    styles = "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800";
                  } else if (status === 'VU' || status.includes('Vulnerable')) {
                    styles = "bg-yellow-100 text-yellow-900 border-yellow-400 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700";
                  } else if (status === 'NT' || status.includes('Near Threatened')) {
                    styles = "bg-lime-100 text-lime-900 border-lime-400 dark:bg-lime-900/40 dark:text-lime-300 dark:border-lime-700";
                  } else if (status === 'LC' || status.includes('Least Concern')) {
                    styles = "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800";
                  }

                  return (
                    <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full border shadow-sm ${styles}`}>
                      🛡️ {status}
                    </span>
                  );
                })()}

                {[
                  { key: 'endemic', label: 'Endemic', style: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' },
                  { key: 'medicinal', label: 'Medicinal', style: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' },
                  { key: 'poisonous', label: 'Poisonous', style: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700' },
                  { key: 'edible', label: 'Edible', style: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700' },
                  { key: 'garden', label: 'Garden', style: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700' },
                  { key: 'exotic', label: 'Exotic', style: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700' },
                ].filter(flag => selectedPlant.flags?.[flag.key]).map((flag) => (
                  <span 
                    key={flag.key} 
                    className={`text-xs font-extrabold px-3 py-1.5 rounded-full border shadow-sm ${flag.style}`}
                  >
                    {flag.label}
                  </span>
                ))}
              </div>

              {/* Citation */}
              {selectedPlant.citation && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Citation</h3>
                  <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    {formatCitationText(selectedPlant.citation)}
                  </div>
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
      {fullscreenImage && selectedPlant && selectedPlant.images && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-8"
          onClick={() => {
            setFullscreenImage(null);
            setIsZoomed(false);
          }}
          onTouchStart={(e) => {
            setTouchEnd(null);
            setTouchStart(e.targetTouches[0].clientX);
          }}
          onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
          onTouchEnd={() => {
            if (!touchStart || !touchEnd) return;
            const distance = touchStart - touchEnd;
            const minSwipeDistance = 50;
            if (distance > minSwipeDistance) {
              // Left swipe -> Next
              const newIdx = currentImageIndex < selectedPlant.images.length - 1 ? currentImageIndex + 1 : 0;
              setCurrentImageIndex(newIdx);
              setFullscreenImage(getImageUrl(selectedPlant.images[newIdx]));
              setIsZoomed(false);
            } else if (distance < -minSwipeDistance) {
              // Right swipe -> Previous
              const newIdx = currentImageIndex > 0 ? currentImageIndex - 1 : selectedPlant.images.length - 1;
              setCurrentImageIndex(newIdx); 
              setFullscreenImage(getImageUrl(selectedPlant.images[newIdx]));
              setIsZoomed(false);
            }
          }}
        >
          <button 
            className="absolute top-2 right-2 sm:top-8 sm:right-8 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-red-500 text-white transition-colors z-[70] text-2xl sm:text-3xl shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
              setIsZoomed(false);
            }}
          >
            &times;
          </button>
          
          {selectedPlant.images.length > 1 && (
            <>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const newIdx = currentImageIndex > 0 ? currentImageIndex - 1 : selectedPlant.images.length - 1;
                  setCurrentImageIndex(newIdx); 
                  setFullscreenImage(getImageUrl(selectedPlant.images[newIdx]));
                  setIsZoomed(false); 
                }}
                className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[70] flex items-center justify-center text-xl sm:text-2xl"
              >
                &#10094;
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const newIdx = currentImageIndex < selectedPlant.images.length - 1 ? currentImageIndex + 1 : 0;
                  setCurrentImageIndex(newIdx);
                  setFullscreenImage(getImageUrl(selectedPlant.images[newIdx]));
                  setIsZoomed(false); 
                }}
                className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[70] flex items-center justify-center text-xl sm:text-2xl"
              >
                &#10095;
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-white font-mono text-sm border border-white/20 shadow-lg z-[70]">
                {currentImageIndex + 1} / {selectedPlant.images.length}
              </div>
            </>
          )}

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
              <ImageWithLoading 
                src={fullscreenImage} 
                alt="Fullscreen view"
                className="w-full h-full"
                imgClassName={`transition-all duration-300 ${isZoomed ? 'max-w-none scale-150 cursor-zoom-out' : 'max-w-full max-h-[100vh] object-contain cursor-zoom-in'}`}
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
