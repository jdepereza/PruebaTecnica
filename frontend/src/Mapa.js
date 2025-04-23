import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configurar íconos por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

// Componente para manejar la actualización de la vista del mapa y eventos de clic
function MapEvents({ center, zoom, onMapClick }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, {
        duration: 1.5, // Duración de la animación en segundos
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);
  
  // Añadir evento de doble clic al mapa
  useEffect(() => {
    if (!map) return;
    
    const handleMapDoubleClick = (e) => {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    };
    
    map.on('dblclick', handleMapDoubleClick);
    
    // Cleanup
    return () => {
      map.off('dblclick', handleMapDoubleClick);
    };
  }, [map, onMapClick]);
  
  return null;
}

const initialCenter = [7.89391, -72.50782];

export default function Mapa() {
  const [center, setCenter] = useState(initialCenter);
  const [mapZoom, setMapZoom] = useState(13);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [clickMarker, setClickMarker] = useState(null);
  const mapRef = useRef(null);
  
  // Referencia para el temporizador de debounce
  const searchTimeoutRef = useRef(null);
  // Cache para almacenar resultados de búsquedas previas
  const searchCacheRef = useRef({});
  
  // Función para manejar la búsqueda de sugerencias con debounce y caché
  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchText(query);

    // Limpiar cualquier temporizador existente
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length > 2) { // Solo empezar a buscar después de 3 caracteres
      setLoading(true);
      
      // Verificar si tenemos resultados en caché
      if (searchCacheRef.current[query]) {
        setSuggestions(searchCacheRef.current[query]);
        setLoading(false);
        return;
      }
      
      // Establecer un temporizador para realizar la búsqueda (debounce)
      searchTimeoutRef.current = setTimeout(() => {
        // Quitar restricciones geográficas para búsquedas globales
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5`)
          .then((response) => response.json())
          .then((data) => {
            const results = data.slice(0, 3); // Tomamos solo 3 sugerencias
            // Guardar en caché
            searchCacheRef.current[query] = results;
            setSuggestions(results);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error al obtener sugerencias: ", err);
            setLoading(false);
          });
      }, 300); // Esperar 300ms antes de realizar la búsqueda
    } else {
      setSuggestions([]);
      setLoading(false);
    }
  };

  // Función para manejar clics en el mapa
  const handleMapClick = useCallback((latlng) => {
    setLoading(true);
    const { lat, lng } = latlng;
    
    // Actualizar el marcador de clic temporal
    setClickMarker({ lat, lng });
    
    // Realizar geocodificación inversa para obtener la dirección
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`)
      .then(response => response.json())
      .then(data => {
        if (data && data.display_name) {
          // Actualizar el campo de búsqueda con la dirección encontrada
          setSearchText(data.display_name);
          
          // Agregar la ubicación seleccionada a la lista
          const newLocation = {
            id: Date.now(),
            position: [lat, lng],
            name: data.name || data.display_name.split(',')[0],
            fullName: data.display_name
          };
          
          setSelectedLocations(prevLocations => [...prevLocations, newLocation]);
          
          // Actualizar centro del mapa
          setCenter([lat, lng]);
          
          // Limpiar el marcador temporal
          setClickMarker(null);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error en geocodificación inversa:", error);
        setLoading(false);
      });
  }, []);

  // Función para manejar la selección de una sugerencia
  const handleSuggestionClick = (suggestion) => {
    const { lat, lon, display_name } = suggestion;
    const newPosition = [parseFloat(lat), parseFloat(lon)];
    
    // Agregar la ubicación seleccionada a la lista
    const newLocation = {
      id: Date.now(), // ID único para cada ubicación
      position: newPosition,
      name: display_name.split(',')[0],
      fullName: display_name
    };
    
    setSelectedLocations(prevLocations => [...prevLocations, newLocation]);
    
    // Actualizar centro del mapa y zoom
    setCenter(newPosition);
    setMapZoom(13); // Puedes ajustar el nivel de zoom según necesites
    setSearchText(display_name);
    setSuggestions([]);
  };

  // Función para limpiar el campo de búsqueda
  const clearSearch = () => {
    setSearchText('');
    setSuggestions([]);
  };

  // Función para eliminar una ubicación
  const removeLocation = (locationId) => {
    setSelectedLocations(prevLocations => 
      prevLocations.filter(loc => loc.id !== locationId)
    );
  };

  // Estilo personalizado para empujar los controles de zoom hacia abajo
  const customMapStyle = `
    .leaflet-top.leaflet-left {
      top: 70px !important;
    }
    .map-click-info {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 1000;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
  `;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Estilos personalizados para los controles de zoom */}
      <style>{customMapStyle}</style>
      
      {/* Mensaje de ayuda para el usuario */}
      <div className="map-click-info">
        Haz doble clic en cualquier lugar del mapa para seleccionar una ubicación
      </div>
      
      {/* Barra de búsqueda */}
      <div className="search-control" style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        right: '10px', 
        zIndex: 1000 
      }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Buscar ubicación (ciudad, dirección, lugar)"
            className="input-autocomplete"
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '4px',
              border: '1px solid #ccc',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
          
          {searchText && (
            <button 
              onClick={clearSearch}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          )}
        </div>
        
        {loading && (
          <div style={{ 
            background: 'white', 
            padding: '10px', 
            borderRadius: '0 0 4px 4px',
            border: '1px solid #ccc',
            borderTop: 'none',
            textAlign: 'center'
          }}>
            Cargando sugerencias...
          </div>
        )}
        
        {suggestions.length > 0 && (
          <ul style={{ 
            listStyle: 'none',
            margin: '0',
            padding: '0',
            background: 'white',
            border: '1px solid #ccc',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {suggestions.map((suggestion, index) => {
              // Determinar el tipo de ubicación
              let type = 'Lugar';
              if (suggestion.type === 'city' || suggestion.type === 'administrative') {
                type = 'Ciudad';
              } else if (suggestion.address && (
                suggestion.address.hospital || 
                suggestion.address.hotel || 
                suggestion.address.restaurant)
              ) {
                type = 'Establecimiento';
              } else if (suggestion.address && suggestion.address.road) {
                type = 'Dirección';
              }
              
              return (
                <li 
                  key={index} 
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{ 
                    padding: '10px',
                    borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {suggestion.display_name.split(',')[0]}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {suggestion.display_name.split(',').slice(1).join(',')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                    {type}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Mapa Leaflet */}
      <MapContainer
        center={initialCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        
        {/* Componente para cambiar la vista del mapa y manejar eventos */}
        <MapEvents 
          center={center} 
          zoom={mapZoom} 
          onMapClick={handleMapClick} 
        />
        
        {/* Marcadores para cada ubicación seleccionada */}
        {selectedLocations.map((location) => (
          <Marker key={location.id} position={location.position}>
            <Popup>
              <div>
                <strong>{location.name}</strong>
                <p style={{ fontSize: '12px', margin: '5px 0' }}>{location.fullName}</p>
                <button 
                  onClick={() => removeLocation(location.id)}
                  style={{
                    padding: '3px 8px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Eliminar
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Marcador temporal para la ubicación clickeada */}
        {clickMarker && (
          <Marker 
            position={[clickMarker.lat, clickMarker.lng]}
            opacity={0.7}
          >
            <Popup autoOpen={true}>
              <div>
                <p style={{ margin: '5px 0' }}>Obteniendo información...</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}