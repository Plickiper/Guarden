import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialPosition?: [number, number];
}

interface MapControllerProps {
  position: L.LatLng | null;
  setPosition: (position: L.LatLng) => void;
  onLocationSelect: (lat: number, lng: number) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

const MapController: React.FC<MapControllerProps> = ({ position, setPosition, onLocationSelect }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 17); // Zoom in closer for accuracy
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const newPos = new L.LatLng(lat, lng);
      setPosition(newPos);
      onLocationSelect(lat, lng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const LocationMap: React.FC<LocationMapProps> = ({ onLocationSelect, initialPosition }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [position, setPosition] = useState<L.LatLng | null>(
    initialPosition ? new L.LatLng(initialPosition[0], initialPosition[1]) : null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const locationWatchId = useRef<number | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMapLoaded(true);
    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, []);

  // Debounced search function
  const searchPlaces = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Search with Philippines bounding box coordinates
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=20&lang=en&lat=12.8797&lon=121.7740&bbox=116.9,4.5,126.6,21.2`
      );
      const data = await response.json();
      
      console.log('Search query:', query);
      console.log('API response:', data);
      
      if (data.features && Array.isArray(data.features)) {
        console.log('First feature example:', data.features[0]);
        
        let results: SearchResult[] = data.features.map((feature: any) => {
          console.log('Processing feature:', feature);
          return {
            place_id: feature.properties?.osm_id || feature.properties?.place_id || Math.random(),
            display_name: feature.properties?.display_name || feature.properties?.name || 'Unknown location',
            lat: feature.geometry?.coordinates?.[1]?.toString() || '0',
            lon: feature.geometry?.coordinates?.[0]?.toString() || '0',
            type: feature.properties?.type || feature.properties?.osm_type || 'unknown',
            importance: feature.properties?.importance || 0
          };
        });
        
        console.log('Processed results before filtering:', results);
        
        // If no results from bounded search, try global search and filter by coordinates
        if (results.length === 0) {
          console.log('No results from bounded search, trying global search...');
          const globalResponse = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=50&lang=en`
          );
          const globalData = await globalResponse.json();
          
          if (globalData.features && Array.isArray(globalData.features)) {
            results = globalData.features
              .map((feature: any) => ({
                place_id: feature.properties?.osm_id || feature.properties?.place_id || Math.random(),
                display_name: feature.properties?.display_name || feature.properties?.name || 'Unknown location',
                lat: feature.geometry?.coordinates?.[1]?.toString() || '0',
                lon: feature.geometry?.coordinates?.[0]?.toString() || '0',
                type: feature.properties?.type || feature.properties?.osm_type || 'unknown',
                importance: feature.properties?.importance || 0
              }))
              .filter((result: SearchResult) => {
                // Filter by coordinates to ensure it's within Philippines bounds
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                return lat >= 4.5 && lat <= 21.2 && lon >= 116.9 && lon <= 126.6;
              });
          }
        }
        
        // Limit to top 5 results
        results = results.slice(0, 5);
        
        console.log('Final processed results:', results);
        setSearchResults(results);
      } else {
        console.log('No features found in response');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input changes with debouncing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowResults(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const newPos = new L.LatLng(lat, lng);
    
    setPosition(newPos);
    onLocationSelect(lat, lng);
    setSearchQuery(result.display_name);
    setShowResults(false);
    setSearchResults([]);
  };

  // Handle clicking outside search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShareLocation = () => {
    setIsLocating(true);
    let bestLocation: GeolocationPosition | null = null;
    let attempts = 0;

    const timeoutId = setTimeout(() => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      
      if (bestLocation) {
        // Use the best location found, even if not highly accurate
        const { latitude, longitude, accuracy } = bestLocation.coords;
        const newPos = new L.LatLng(latitude, longitude);
        setPosition(newPos);
        onLocationSelect(latitude, longitude);
        alert(`Location found with accuracy of ${accuracy.toFixed(0)} meters.`);
      } else {
        alert("Could not get your location. Please ensure location services are enabled and permissions are granted.");
      }
      setIsLocating(false);
    }, 8000); // Reduced timeout to 8 seconds

    locationWatchId.current = navigator.geolocation.watchPosition(
      (location) => {
        attempts++;
        const { accuracy } = location.coords;
        
        // Update the best location if the new one is more accurate
        if (!bestLocation || accuracy < bestLocation.coords.accuracy) {
          bestLocation = location;
        }
        
        // Use location if it's reasonably accurate OR if we've tried enough times
        if (accuracy < 200 || attempts >= 3) {
          if (locationWatchId.current !== null) {
            navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = null;
          }
          clearTimeout(timeoutId);

          const { latitude, longitude } = location.coords;
          const newPos = new L.LatLng(latitude, longitude);
          setPosition(newPos);
          onLocationSelect(latitude, longitude);
          setIsLocating(false);
        }
      },
      (error) => {
        if (locationWatchId.current !== null) {
          navigator.geolocation.clearWatch(locationWatchId.current);
          locationWatchId.current = null;
        }
        clearTimeout(timeoutId);
        console.error("Error getting location:", error);
        
        let errorMessage = "Unable to retrieve your location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please enable location permissions in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable. Please try again.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += "Please ensure location services are enabled and try again.";
        }
        
        alert(errorMessage);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false, // Changed to false for better compatibility
        maximumAge: 60000, // Allow cached positions up to 1 minute old
        timeout: 10000 // Reduced timeout to 10 seconds
      }
    );
  };

  if (!mapLoaded) {
    return <div className="h-[400px] bg-gray-100 rounded-lg animate-pulse" />;
  }

  return (
    <div className="h-[500px] w-full">
      {/* Map Container */}
      <div className="h-[400px] w-full rounded-lg overflow-hidden">
        <MapContainer
          center={initialPosition || [12.8797, 121.7740]} // Philippines center coordinates
          zoom={6} // Zoom out to show more of Philippines
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
          maxBounds={[
            [4.5, 116.9], // Southwest bounds of Philippines
            [21.2, 126.6]  // Northeast bounds of Philippines
          ]}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController 
            position={position}
            setPosition={setPosition}
            onLocationSelect={onLocationSelect}
          />
        </MapContainer>
      </div>

      {/* Search Bar */}
      <div className="search-container relative mt-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search for a place in the Philippines..."
            className="w-full px-4 py-3 pl-10 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleResultSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900 truncate">
                  {result.display_name && result.display_name.split(',')[0]}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {result.display_name && result.display_name.split(',').slice(1).join(',').trim()}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showResults && searchQuery.length >= 3 && !isSearching && searchResults.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="px-4 py-3 text-gray-500 text-center">
              No places found in the Philippines
            </div>
          </div>
        )}
      </div>

      {/* Location Button */}
      <div className="mt-4 flex justify-center">
        <button 
          onClick={handleShareLocation}
          disabled={isLocating}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400"
        >
          {isLocating ? 'Locating...' : 'Share My Location'}
        </button>
      </div>
    </div>
  );
};

export default LocationMap; 