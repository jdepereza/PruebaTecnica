import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-control-geocoder';

export default function LeafletSearchMap() {
  const [position, setPosition] = useState([-34.6037, -58.3816]); // Ubicación inicial
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const markerRef = useRef(null);
  const mapRef = useRef();

  // Función para manejar la búsqueda de sugerencias
  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchText(query);

    if (query.length > 2) { // Solo empezar a buscar después de 3 caracteres
      setLoading(true);
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5`)
        .then((response) => response.json())
        .then((data) => {
          const results = data.slice(0, 3); // Tomamos solo 3 sugerencias
          setSuggestions(results);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al obtener sugerencias: ", err);
          setLoading(false);
        });
    } else {
      setSuggestions([]);
    }
  };

  // Función para manejar la selección de una sugerencia
  const handleSuggestionClick = (suggestion) => {
    const { lat, lon, display_name } = suggestion;
    setPosition([lat, lon]);
    setSearchText(display_name); // Actualiza el campo de búsqueda con la descripción de la ubicación
    setSuggestions([]); // Limpiar las sugerencias
    const map = mapRef.current;
    map.setView([lat, lon], 13); // Mover el mapa a la nueva ubicación
  };

  // Manejador de eventos para el mapa (cuando se hace clic en él)
  function MapEventHandler() {
    useMapEvents({
      click(e) {
        const { latlng } = e;
        setPosition([latlng.lat, latlng.lng]);
        const geocoder = L.Control.Geocoder.nominatim();
        geocoder.reverse(latlng, mapRef.current.options.crs.scale(mapRef.current.getZoom()), results => {
          if (results.length > 0) {
            setSearchText(results[0].name);
          }
        });
      }
    });
    return null;
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <input
        type="text"
        value={searchText}
        onChange={handleSearchChange}
        placeholder="Buscar ubicación"
        className="input-autocomplete"
      />
      {loading && <div>Cargando sugerencias...</div>}
      <ul className="suggestions-list">
        {suggestions.map((suggestion, index) => (
          <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
            {suggestion.display_name}
          </li>
        ))}
      </ul>

      <MapContainer
        center={position}
        zoom={13}
        style={{ height: '90%', width: '100%' }}
        whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} ref={markerRef} />
        <MapEventHandler />
      </MapContainer>
    </div>
  );
}
