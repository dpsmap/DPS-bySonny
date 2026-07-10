import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Compass,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  Layers,
  Check,
  Loader2,
  AlertCircle,
  Info,
  Map,
  Ruler
} from 'lucide-react';

interface LocationItem {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: 'Park' | 'Landmark' | 'Entertainment' | 'Culture';
}

const SAMPLE_LOCATIONS: LocationItem[] = [
  {
    id: '1',
    title: 'Central Park',
    description: 'An iconic, expansive 843-acre green oasis in Manhattan featuring scenic lakes, walking paths, theaters, and a zoo.',
    lat: 40.7829,
    lng: -73.9654,
    category: 'Park'
  },
  {
    id: '2',
    title: 'Empire State Building',
    description: 'A legendary 102-story Art Deco skyscraper in Midtown Manhattan. Offers breathtaking 360-degree views of the city skyline.',
    lat: 40.7484,
    lng: -73.9857,
    category: 'Landmark'
  },
  {
    id: '3',
    title: 'Brooklyn Bridge',
    description: 'A historic cable-stayed/suspension bridge completed in 1883, connecting Manhattan and Brooklyn across the East River.',
    lat: 40.7061,
    lng: -73.9969,
    category: 'Landmark'
  },
  {
    id: '4',
    title: 'Times Square',
    description: 'The glowing epicenter of the world, famous for its massive digital billboards, theaters, street performers, and non-stop energy.',
    lat: 40.7580,
    lng: -73.9855,
    category: 'Entertainment'
  },
  {
    id: '5',
    title: 'The High Line',
    description: 'A gorgeous public park built on a historic, elevated freight rail line on Manhattan’s West Side, featuring native gardens and art installations.',
    lat: 40.7480,
    lng: -74.0048,
    category: 'Park'
  },
  {
    id: '6',
    title: 'The Metropolitan Museum of Art',
    description: 'Over 5,000 years of art from around the globe is displayed inside this monumental gallery overlooking Central Park.',
    lat: 40.7794,
    lng: -73.9632,
    category: 'Culture'
  }
];

const CATEGORIES = ['All', 'Park', 'Landmark', 'Entertainment', 'Culture'] as const;

export default function App() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<any>(null);
  const markerInstancesRef = useRef<{ [id: string]: any }>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Geolocation states
  const [geolocationStatus, setGeolocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [geolocationMessage, setGeolocationMessage] = useState<string | null>(null);

  // Ruler states and refs
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<[number, number][]>([]);
  const [rulerDistance, setRulerDistance] = useState<number | null>(null);
  const rulerMarkersRef = useRef<any[]>([]);
  const rulerPolylineRef = useRef<any>(null);

  // Filter logic
  const filteredLocations = useMemo(() => {
    return SAMPLE_LOCATIONS.filter((loc) => {
      const matchesSearch =
        loc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || loc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Park':
        return {
          bg: 'bg-emerald-500',
          ping: 'bg-emerald-400',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20',
          badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          bullet: 'bg-emerald-400',
        };
      case 'Landmark':
        return {
          bg: 'bg-amber-500',
          ping: 'bg-amber-400',
          text: 'text-amber-400',
          border: 'border-amber-500/20',
          badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          bullet: 'bg-amber-400',
        };
      case 'Entertainment':
        return {
          bg: 'bg-rose-500',
          ping: 'bg-rose-400',
          text: 'text-rose-400',
          border: 'border-rose-500/20',
          badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
          bullet: 'bg-rose-400',
        };
      case 'Culture':
        return {
          bg: 'bg-indigo-500',
          ping: 'bg-indigo-400',
          text: 'text-indigo-400',
          border: 'border-indigo-500/20',
          badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
          bullet: 'bg-indigo-400',
        };
      default:
        return {
          bg: 'bg-sky-500',
          ping: 'bg-sky-400',
          text: 'text-sky-400',
          border: 'border-sky-500/20',
          badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
          bullet: 'bg-sky-400',
        };
    }
  };

  // Helper to create custom HTML Leaflet DivIcon
  const createMarkerIcon = (category: string) => {
    const L = (window as any).L;
    if (!L) return null;

    const colors = getCategoryColor(category);
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <span class="absolute inline-flex h-8 w-8 animate-ping rounded-full ${colors.ping} opacity-20"></span>
          <div class="relative flex items-center justify-center rounded-full w-5 h-5 ${colors.bg} border-2 border-zinc-950 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-125 hover:shadow-[0_0_15px_${colors.bg}]">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      className: 'custom-map-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -10]
    });
  };

  // Toast status helper
  const triggerToast = (status: 'idle' | 'locating' | 'success' | 'error', message: string | null) => {
    setGeolocationStatus(status);
    setGeolocationMessage(message);
    if (status === 'success' || status === 'error') {
      setTimeout(() => {
        setGeolocationStatus('idle');
        setGeolocationMessage(null);
      }, 4000);
    }
  };

  // Initialize Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Center on NYC with a standard 12 zoom level
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // will place custom zoom control in top-right
      attributionControl: true
    }).setView([40.7128, -74.0060], 12);

    mapInstanceRef.current = map;

    // CartoDB Dark Matter tile server for a dark layout
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Place zoom controls on top-right to avoid overlapping with left sidebar
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Create marker layers group
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Auto toggle sidebar state based on mobile width on initial load
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      rulerMarkersRef.current.forEach(m => m.remove());
      rulerMarkersRef.current = [];
      if (rulerPolylineRef.current) {
        rulerPolylineRef.current.remove();
        rulerPolylineRef.current = null;
      }
    };
  }, []);

  // Effect to manage click listeners on the map when ruler is active
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    if (isRulerActive) {
      // Change map container cursor to crosshair for precision clicking
      const container = map.getContainer();
      container.style.cursor = 'crosshair';

      const onMapClick = (e: any) => {
        const { lat, lng } = e.latlng;
        
        setRulerPoints((prev) => {
          if (prev.length >= 2) {
            // Reset and start new measurement with the clicked point as Point A
            return [[lat, lng]];
          } else {
            return [...prev, [lat, lng]];
          }
        });
      };

      map.on('click', onMapClick);

      return () => {
        map.off('click', onMapClick);
        container.style.cursor = '';
      };
    } else {
      // Clean up when deactivated
      setRulerPoints([]);
      setRulerDistance(null);
    }
  }, [isRulerActive]);

  // Effect to draw and update Ruler visual markers and polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // Clear existing ruler elements from map
    rulerMarkersRef.current.forEach(m => m.remove());
    rulerMarkersRef.current = [];
    if (rulerPolylineRef.current) {
      rulerPolylineRef.current.remove();
      rulerPolylineRef.current = null;
    }

    if (rulerPoints.length === 0) {
      setRulerDistance(null);
      return;
    }

    // Add marker for each point
    rulerPoints.forEach((point, idx) => {
      const label = idx === 0 ? 'A' : 'B';
      const colorClass = idx === 0 ? 'bg-indigo-500' : 'bg-fuchsia-500';
      const ringClass = idx === 0 ? 'bg-indigo-400' : 'bg-fuchsia-400';
      
      const icon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="absolute inline-flex h-8 w-8 animate-ping rounded-full ${ringClass} opacity-25"></span>
            <div class="relative flex items-center justify-center rounded-full w-6 h-6 ${colorClass} border border-zinc-950 text-[10px] font-black text-white shadow-lg shadow-black/60">
              ${label}
            </div>
          </div>
        `,
        className: 'ruler-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(point, { icon }).addTo(map);
      rulerMarkersRef.current.push(marker);
    });

    if (rulerPoints.length === 2) {
      const p1 = L.latLng(rulerPoints[0]);
      const p2 = L.latLng(rulerPoints[1]);
      
      // Calculate precise geodesic distance
      const dist = p1.distanceTo(p2);
      setRulerDistance(dist);

      // Draw beautiful dashed/pulsing connecting line
      const polyline = L.polyline(rulerPoints, {
        color: '#a855f7', // purple-500 matches our theme
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      
      rulerPolylineRef.current = polyline;

      // Fit map bounds to encompass both measurement points
      const bounds = L.latLngBounds(rulerPoints);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
        duration: 1.2
      });
    } else {
      setRulerDistance(null);
    }
  }, [rulerPoints]);

  // Update Markers when Filtered Locations change
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();
    const newMarkerMap: { [id: string]: any } = {};

    filteredLocations.forEach((loc) => {
      const icon = createMarkerIcon(loc.category);
      if (!icon) return;

      const marker = L.marker([loc.lat, loc.lng], { icon });

      const colors = getCategoryColor(loc.category);
      
      // Customized popup contents matching dark mode theme
      const popupHTML = `
        <div class="p-3 bg-zinc-950 text-zinc-100 rounded-xl min-w-[220px] max-w-[260px] border border-zinc-800 shadow-2xl">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="inline-block px-2.5 py-0.5 text-[9px] font-semibold rounded bg-zinc-900 border ${colors.border} ${colors.text} uppercase tracking-wider">${loc.category}</span>
          </div>
          <h3 class="font-bold text-sm text-white mb-1 tracking-tight leading-snug">${loc.title}</h3>
          <p class="text-xs text-zinc-400 leading-relaxed font-normal">${loc.description}</p>
          <div class="mt-2.5 pt-2 border-t border-zinc-800/60 text-[9px] text-zinc-500 flex items-center justify-between">
            <span>Lat: ${loc.lat.toFixed(4)}</span>
            <span>Lng: ${loc.lng.toFixed(4)}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHTML, {
        className: 'custom-leaflet-popup',
        closeButton: false,
        offset: [0, -6]
      });

      // Track popup open/close state to match UI selection
      marker.on('click', () => {
        setSelectedLocationId(loc.id);
      });

      marker.addTo(markersLayerRef.current);
      newMarkerMap[loc.id] = marker;
    });

    markerInstancesRef.current = newMarkerMap;
  }, [filteredLocations]);

  // Handle fly to location
  const handleSelectLocation = (loc: LocationItem) => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    setSelectedLocationId(loc.id);

    // On small screens, hide sidebar to show map view clearly
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    // Fly to coordinates smoothly
    mapInstanceRef.current.flyTo([loc.lat, loc.lng], 14, {
      duration: 1.5,
      easeLinearity: 0.25
    });

    // Open popup after a minor timeout to wait for transition
    setTimeout(() => {
      const marker = markerInstancesRef.current[loc.id];
      if (marker) {
        marker.openPopup();
      }
    }, 800);
  };

  // Browser Geolocation Functionality
  const handleFindMyLocation = () => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    if (!navigator.geolocation) {
      triggerToast('error', 'Geolocation is not supported by your browser.');
      return;
    }

    triggerToast('locating', 'Requesting coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        triggerToast('success', `Location found! Accuracy: ±${Math.round(accuracy)}m`);

        // Fly to user location
        mapInstanceRef.current.flyTo([latitude, longitude], 15, {
          duration: 1.8
        });

        // Add or update User Location marker
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          const userIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-10 h-10">
                <span class="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-sky-400 opacity-30"></span>
                <span class="absolute inline-flex h-6 w-6 rounded-full bg-sky-400/20"></span>
                <div class="relative flex items-center justify-center rounded-full w-4.5 h-4.5 bg-sky-500 border-2 border-white shadow-lg">
                  <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
            `,
            className: 'user-location-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });

          const userMarker = L.marker([latitude, longitude], { icon: userIcon });
          
          userMarker.bindPopup(`
            <div class="p-2 bg-zinc-950 text-zinc-100 rounded-lg border border-sky-950/30 shadow-xl text-center">
              <span class="font-bold text-xs text-sky-400">You are here</span>
              <p class="text-[10px] text-zinc-500 mt-0.5">Accurate to ${Math.round(accuracy)} meters</p>
            </div>
          `, {
            className: 'custom-leaflet-popup',
            closeButton: false,
            offset: [0, -6]
          });

          userMarker.addTo(mapInstanceRef.current);
          userLocationMarkerRef.current = userMarker;
        }

        setTimeout(() => {
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.openPopup();
          }
        }, 1200);
      },
      (error) => {
        let errorMessage = 'Could not retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please allow map access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position unavailable. Check GPS/network signals.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Request timed out. Please try again.';
            break;
        }
        triggerToast('error', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden font-sans select-none bg-zinc-950" id="main-layout">
      {/* MAP VIEWPORT */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full z-0"
        id="map-container"
      />

      {/* TOP FLOATING TOAST/ALERT PORTAL */}
      {geolocationStatus !== 'idle' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 shadow-2xl backdrop-blur-md transition-all duration-300 animate-bounce">
          {geolocationStatus === 'locating' && (
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
          )}
          {geolocationStatus === 'success' && (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
          {geolocationStatus === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-xs font-medium text-zinc-200">{geolocationMessage}</span>
        </div>
      )}

      {/* FLOATING SIDEBAR / CONTROL PANEL */}
      <div
        className={`absolute top-0 md:top-4 left-0 md:left-4 z-[1000] h-full md:h-[calc(100vh-2rem)] w-full sm:w-85 max-w-full flex flex-col bg-zinc-950/92 md:bg-zinc-950/85 backdrop-blur-lg border-r md:border border-zinc-800/80 shadow-2xl transition-all duration-300 ${
          isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
        }`}
        id="sidebar"
      >
        {/* HEADER SECTION */}
        <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1">
                NY Explorer
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              </h1>
              <p className="text-[10px] text-zinc-500 leading-none">Interactive Web Map Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent hover:border-zinc-800 transition"
              title="About Map"
              id="info-btn"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent hover:border-zinc-800 transition md:hidden"
              title="Close Sidebar"
              id="close-sidebar-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* INFO MODAL OVERLAY IN SIDEBAR */}
        {showInfoPanel && (
          <div className="p-4 bg-zinc-900/90 border-b border-indigo-900/20 text-xs text-zinc-400 animate-fadeIn" id="info-panel">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-zinc-200">About App</span>
              <button onClick={() => setShowInfoPanel(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="leading-relaxed">
              This interactive dashboard parses custom spatial datasets on top of OpenStreetMap using custom Leaflet.js DivIcons. Dive into points of interest using structural filters or use live GPS telemetry to locate yourself.
            </p>
            <div className="mt-2 text-[10px] text-indigo-400 flex items-center gap-1">
              <span>● Offline persistence enabled</span>
              <span>•</span>
              <span>● Dark Matter styled tiles</span>
            </div>
          </div>
        )}

        {/* CONTROLS AREA */}
        <div className="p-4 border-b border-zinc-800/60 flex flex-col gap-3">
          {/* GEOLOCATION & RULER CONTROLS */}
          <div className="flex gap-2">
            <button
              onClick={handleFindMyLocation}
              disabled={geolocationStatus === 'locating'}
              className="flex-1 h-11 flex items-center justify-center gap-1.5 px-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white rounded-lg text-[11px] font-semibold shadow-md active:scale-98 transition disabled:opacity-50 cursor-pointer"
              id="find-location-btn"
              title="Find My Location"
            >
              {geolocationStatus === 'locating' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              Locate Me
            </button>

            <button
              onClick={() => {
                setIsRulerActive(!isRulerActive);
                // On small screens, close the sidebar so the user can easily interact with the map
                if (!isRulerActive && window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className={`flex-1 h-11 flex items-center justify-center gap-1.5 px-2 rounded-lg text-[11px] font-semibold border active:scale-98 transition cursor-pointer ${
                isRulerActive
                  ? 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
              }`}
              id="sidebar-ruler-btn"
              title="Toggle Ruler Distance Tool"
            >
              <Ruler className={`w-3.5 h-3.5 ${isRulerActive ? 'text-white' : 'text-purple-400'}`} />
              Ruler Tool
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search points or descriptions..."
              className="w-full h-10 pl-9 pr-8 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-zinc-500 transition"
              id="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2.5 p-1 text-zinc-500 hover:text-zinc-300"
                title="Clear Search"
                id="clear-search-btn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* CATEGORY SELECTOR CHIPS */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Categories</span>
            <div className="flex flex-wrap gap-1.5" id="category-filters">
              {CATEGORIES.map((cat) => {
                const colors = getCategoryColor(cat);
                const isSelected = selectedCategory === cat;
                const count = cat === 'All' 
                  ? SAMPLE_LOCATIONS.length 
                  : SAMPLE_LOCATIONS.filter(l => l.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {!isSelected && cat !== 'All' && (
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.bullet}`}></span>
                    )}
                    {cat}
                    <span className={`text-[9px] px-1 rounded-sm ${
                      isSelected ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-800/50 text-zinc-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SEARCH RESULTS / LIST */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            <span>Locations</span>
            <span>{filteredLocations.length} match{filteredLocations.length !== 1 ? 'es' : ''}</span>
          </div>

          {filteredLocations.length > 0 ? (
            <div className="flex flex-col gap-2" id="locations-list">
              {filteredLocations.map((loc) => {
                const isSelected = selectedLocationId === loc.id;
                const colors = getCategoryColor(loc.category);

                return (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition duration-200 flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-zinc-900 border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-zinc-100 leading-tight group-hover:text-white transition">
                        {loc.title}
                      </h4>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${colors.badge} uppercase tracking-wider shrink-0`}>
                        {loc.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-normal leading-relaxed line-clamp-2">
                      {loc.description}
                    </p>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        NYC Metro
                      </span>
                      <span>•</span>
                      <span>Coordinates: {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 gap-2">
              <Map className="w-8 h-8 text-zinc-700 stroke-1" />
              <p className="text-xs font-medium">No matches found</p>
              <p className="text-[10px] text-zinc-600 max-w-[200px]">
                Try revising your filters or search query to list points of interest.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition underline decoration-dotted"
                id="reset-filters-btn"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* FOOTER AREA */}
        <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/95 flex items-center justify-between text-[9px] text-zinc-600 font-medium">
          <span>Leaflet OSM Dark Edition</span>
          <span>v1.0.0</span>
        </div>
      </div>

      {/* FLOATING TRIGGER BUTTON FOR SIDEBAR */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-[1000] p-3 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 text-zinc-200 border border-zinc-800/80 shadow-2xl backdrop-blur-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          title="Open Map Menu"
          id="open-sidebar-btn"
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold pr-1">Show Panel</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      )}

      {/* RULER ACTIVE HUD */}
      {isRulerActive && (
        <div className="absolute bottom-32 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] sm:w-96 p-4 rounded-2xl bg-zinc-950/95 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] backdrop-blur-md transition-all duration-300 flex flex-col gap-3 animate-fadeIn" id="ruler-hud">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400">
              <Ruler className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-extrabold tracking-wider uppercase">Distance Ruler</span>
            </div>
            <button
              onClick={() => setIsRulerActive(false)}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
              title="Close Ruler"
              id="close-ruler-hud-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {rulerPoints.length === 0 && (
            <p className="text-xs text-zinc-400 leading-normal">
              Click anywhere on the map to drop the first measurement point (<span className="text-indigo-400 font-semibold">Point A</span>).
            </p>
          )}

          {rulerPoints.length === 1 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-zinc-400 leading-normal">
                <span className="text-indigo-400 font-semibold">Point A</span> dropped. Click another spot on the map to set <span className="text-fuchsia-400 font-semibold">Point B</span> and calculate distance.
              </p>
              <button
                onClick={() => setRulerPoints([])}
                className="text-left text-[10px] text-zinc-500 hover:text-zinc-300 transition underline cursor-pointer"
                id="reset-point-a-btn"
              >
                Reset Point A
              </button>
            </div>
          )}

          {rulerPoints.length === 2 && rulerDistance !== null && (
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-3 gap-2 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/40">
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Distance</span>
                  <span className="text-xs font-black text-white">
                    {rulerDistance >= 1000 
                      ? `${(rulerDistance / 1000).toFixed(2)} km` 
                      : `${Math.round(rulerDistance)} m`
                    }
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium">
                    {(rulerDistance * 3.28084).toLocaleString(undefined, { maximumFractionDigits: 0 })} ft
                  </span>
                </div>
                <div className="flex flex-col border-l border-zinc-800/60 pl-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Walking Time</span>
                  <span className="text-xs font-black text-purple-400">
                    {Math.max(1, Math.round(rulerDistance / 83.3))} min
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium">
                    at ~5.0 km/h
                  </span>
                </div>
                <div className="flex flex-col border-l border-zinc-800/60 pl-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Est. Steps</span>
                  <span className="text-xs font-black text-indigo-400">
                    {Math.round(rulerDistance / 0.75).toLocaleString()}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium">
                    0.75m stride
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 mt-0.5">
                <div className="text-[9px] text-zinc-500 flex flex-col leading-tight">
                  <span>A: {rulerPoints[0][0].toFixed(4)}, {rulerPoints[0][1].toFixed(4)}</span>
                  <span>B: {rulerPoints[1][0].toFixed(4)}, {rulerPoints[1][1].toFixed(4)}</span>
                </div>
                <button
                  onClick={() => setRulerPoints([])}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-200 hover:text-white rounded-md transition cursor-pointer"
                  id="clear-ruler-btn"
                >
                  Clear Points
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUICK FLOATING RULER BUTTON */}
      <button
        onClick={() => {
          setIsRulerActive(!isRulerActive);
        }}
        className={`absolute bottom-18 right-4 z-[1000] p-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border ${
          isRulerActive
            ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-purple-600/25'
            : 'bg-zinc-950/90 hover:bg-zinc-900 text-zinc-200 border-zinc-800/80'
        }`}
        title="Toggle Ruler Tool"
        id="floating-ruler-btn"
      >
        <Ruler className={`w-4 h-4 ${isRulerActive ? 'text-white' : 'text-purple-400'}`} />
        <span className="text-xs font-bold">Ruler Tool</span>
        {isRulerActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      </button>

      {/* QUICK MAP CENTER BUTTON */}
      <button
        onClick={() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([40.7128, -74.0060], 12, { duration: 1.5 });
            setSelectedLocationId(null);
          }
        }}
        className="absolute bottom-4 right-4 z-[1000] p-3 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 text-zinc-200 border border-zinc-800/80 shadow-2xl backdrop-blur-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        title="Reset Map to NYC"
        id="recenter-btn"
      >
        <Map className="w-4 h-4 text-zinc-400" />
        <span className="text-xs font-bold">Recenter Map</span>
      </button>
    </div>
  );
}
