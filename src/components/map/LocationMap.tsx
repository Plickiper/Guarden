import React, { useState, useEffect, useRef } from 'react';
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
  const locationWatchId = useRef<number | null>(null);

  useEffect(() => {
    setMapLoaded(true);
    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, []);

  const handleShareLocation = () => {
    setIsLocating(true);

    const timeoutId = setTimeout(() => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
        alert("Could not get an accurate location. Please move to an open area and try again.");
        setIsLocating(false);
      }
    }, 15000); // Stop trying after 15 seconds

    locationWatchId.current = navigator.geolocation.watchPosition(
      (location) => {
        const { latitude, longitude, accuracy } = location.coords;
        
        // Wait for the first accurate reading (e.g., under 50 meters)
        if (accuracy < 50) {
          if (locationWatchId.current !== null) {
            navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = null;
          }
          clearTimeout(timeoutId);

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
        alert("Unable to retrieve your location. Please ensure location services are enabled and permissions are granted.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
      }
    );
  };

  if (!mapLoaded) {
    return <div className="h-[400px] bg-gray-100 rounded-lg animate-pulse" />;
  }

  return (
    <div className="h-[450px] w-full">
      <div className="h-[400px] w-full rounded-lg overflow-hidden">
        <MapContainer
          center={initialPosition || [14.5995, 120.9842]} // Manila coordinates
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
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