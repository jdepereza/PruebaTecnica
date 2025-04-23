import React, { useState, useRef, useEffect, useCallback } from 'react';

const initialCenter = { lat: 7.89391, lng: -72.50782 };

export default function GoogleMap() {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markersRef = useRef([]);
  const tempMarkerRef = useRef(null);
  const autoCompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [mapError, setMapError] = useState(null);
  
  // Reference for debounce timer
  const searchTimeoutRef = useRef(null);
  // Cache to store previous search results
  const searchCacheRef = useRef({});

  // Initialize Google Maps
  useEffect(() => {
    const loadMap = () => {
      try {
        // Check if Google Maps API loaded correctly
        if (!window.google || !window.google.maps) {
          console.error("Google Maps API did not load correctly");
          setMapError("Could not load Google Maps. Verify your API key.");
          return;
        }

        console.log("Initializing Google Maps...");
        
        const mapOptions = {
          center: initialCenter,
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        };
        
        // Create the map
        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        googleMapRef.current = map;
        
        // Create the geocoder
        geocoderRef.current = new window.google.maps.Geocoder();
        
        // Initialize Places services if available
        if (window.google.maps.places) {
          autoCompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
          placesServiceRef.current = new window.google.maps.places.PlacesService(map);
        }
        
        // Set up double-click event
        map.addListener('dblclick', (event) => {
          handleMapDoubleClick(event.latLng);
        });

        console.log("Google Maps initialized successfully");
        
        // Add an initial marker to verify map is working
        new window.google.maps.Marker({
          position: initialCenter,
          map,
          title: 'Initial location',
        });
      } catch (error) {
        console.error("Error initializing Google Maps:", error);
        setMapError(`Error initializing map: ${error.message}`);
      }
    };

    // Load Google Maps API if not already loaded
    if (!window.google) {
      console.log("Loading Google Maps API...");
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDojbUyQ30EbzMwNRXKlFYxMQmqRtOw1Y0&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log("Google Maps script loaded correctly");
        loadMap();
      };
      
      script.onerror = (error) => {
        console.error("Error loading Google Maps script:", error);
        setMapError("Could not load Google Maps API. Check your internet connection or API key.");
      };
      
      document.body.appendChild(script);
    } else {
      loadMap();
    }
    
    // Cleanup
    return () => {
      // Clear markers if necessary
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => {
          if (marker.marker) marker.marker.setMap(null);
        });
      }
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setMap(null);
      }
    };
  }, []);

  // Handle double-click on map
  const handleMapDoubleClick = useCallback((latLng) => {
    if (!googleMapRef.current || !geocoderRef.current) {
      console.error("Map or geocoder not initialized");
      return;
    }
    
    setLoading(true);
    
    // Create a temporary marker while getting information
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
    }
    
    tempMarkerRef.current = new window.google.maps.Marker({
      position: latLng,
      map: googleMapRef.current,
      opacity: 0.7,
      title: 'Getting information...'
    });
    
    // Perform reverse geocoding to get the address
    geocoderRef.current.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const address = results[0].formatted_address;
        
        // Update search field with the found address
        setSearchText(address);
        
        // Add the selected location to the list
        const newLocation = {
          id: Date.now(),
          position: latLng,
          name: results[0].address_components[0].short_name,
          fullName: address
        };
        
        setSelectedLocations(prev => [...prev, newLocation]);
        
        // Update map center
        googleMapRef.current.setCenter(latLng);
        
        // Create a permanent marker
        const marker = createMarker(newLocation);
        markersRef.current.push(marker);
        
        // Remove the temporary marker
        if (tempMarkerRef.current) {
          tempMarkerRef.current.setMap(null);
          tempMarkerRef.current = null;
        }
      } else {
        console.error('Geocoder failed due to: ' + status);
        
        // Remove temporary marker in case of error
        if (tempMarkerRef.current) {
          tempMarkerRef.current.setMap(null);
          tempMarkerRef.current = null;
        }
      }
      
      setLoading(false);
    });
  }, []);

  // Create a marker for a location
  const createMarker = (location) => {
    if (!googleMapRef.current) return null;
    
    const marker = new window.google.maps.Marker({
      position: location.position,
      map: googleMapRef.current,
      title: location.name
    });
    
    // Create info window
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div>
          <strong>${location.name}</strong>
          <p style="font-size: 12px; margin: 5px 0">${location.fullName}</p>
          <button id="removeBtn-${location.id}" style="padding: 3px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px">
            Remove
          </button>
        </div>
      `
    });
    
    // Open window when clicking on marker
    marker.addListener('click', () => {
      infoWindow.open(googleMapRef.current, marker);
      
      // Add the remove button listener after window has opened
      setTimeout(() => {
        const removeBtn = document.getElementById(`removeBtn-${location.id}`);
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            removeLocation(location.id);
            infoWindow.close();
          });
        }
      }, 10);
    });
    
    return { marker, infoWindow, id: location.id };
  };

  // Function to handle search
  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchText(query);
    
    // Clear any existing timers
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.length > 2) { // Only start searching after 3 characters
      setLoading(true);
      
      // Check if we have cached results
      if (searchCacheRef.current[query]) {
        setSuggestions(searchCacheRef.current[query]);
        setLoading(false);
        return;
      }
      
      // Validate that the API is loaded
      if (!window.google || !window.google.maps) {
        setLoading(false);
        setMapError("Google Maps API not available");
        return;
      }
      
      // Use Google Places service for autocomplete
      searchTimeoutRef.current = setTimeout(() => {
        try {
          // If Places service is available
          if (autoCompleteServiceRef.current) {
            autoCompleteServiceRef.current.getPlacePredictions(
              { input: query }, 
              (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                  // Convert predictions to the format our component expects
                  const results = predictions.slice(0, 5).map(prediction => ({
                    place_id: prediction.place_id,
                    display_name: prediction.description,
                    type: getPlaceType(prediction.types || [])
                  }));
                  
                  // Save to cache
                  searchCacheRef.current[query] = results;
                  setSuggestions(results);
                } else {
                  setSuggestions([]);
                }
                setLoading(false);
              }
            );
          } else if (geocoderRef.current) {
            // Fallback to simple geocoding if Places isn't available
            geocoderRef.current.geocode({ address: query }, (results, status) => {
              if (status === 'OK') {
                const formattedResults = results.slice(0, 5).map(result => ({
                  place_id: result.place_id,
                  display_name: result.formatted_address,
                  position: result.geometry.location,
                  type: getPlaceType(result.types || [])
                }));
                
                // Save to cache
                searchCacheRef.current[query] = formattedResults;
                setSuggestions(formattedResults);
              } else {
                setSuggestions([]);
              }
              setLoading(false);
            });
          } else {
            setSuggestions([]);
            setLoading(false);
          }
        } catch (error) {
          console.error("Error in search:", error);
          setSuggestions([]);
          setLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setLoading(false);
    }
  };

  // Determine place type based on Google types
  const getPlaceType = (types) => {
    if (!types || types.length === 0) return 'Place';
    
    if (types.includes('locality') || types.includes('administrative_area_level_1')) {
      return 'City';
    } else if (types.includes('establishment')) {
      return 'Establishment';
    } else if (types.includes('street_address') || types.includes('route')) {
      return 'Address';
    }
    return 'Place';
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    if (!googleMapRef.current) {
      console.error("Map not initialized");
      return;
    }
    
    setLoading(true);
    
    try {
      // If we have a place_id, use Places service to get details
      if (suggestion.place_id && placesServiceRef.current) {
        placesServiceRef.current.getDetails(
          { 
            placeId: suggestion.place_id, 
            fields: ['name', 'formatted_address', 'geometry'] 
          }, 
          (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              // Create a location with place details
              const newLocation = {
                id: Date.now(),
                position: place.geometry.location,
                name: place.name || suggestion.display_name.split(',')[0],
                fullName: place.formatted_address || suggestion.display_name
              };
              
              // Add location to the list
              setSelectedLocations(prev => [...prev, newLocation]);
              
              // Center map on location
              googleMapRef.current.setCenter(place.geometry.location);
              googleMapRef.current.setZoom(15);
              
              // Create a marker for the location
              const marker = createMarker(newLocation);
              if (marker) markersRef.current.push(marker);
              
              // Update search field
              setSearchText(place.formatted_address || suggestion.display_name);
            }
            
            setLoading(false);
            setSuggestions([]);
          }
        );
      } else if (suggestion.position) {
        // If we already have the position (from geocoding fallback)
        const newLocation = {
          id: Date.now(),
          position: suggestion.position,
          name: suggestion.display_name.split(',')[0],
          fullName: suggestion.display_name
        };
        
        setSelectedLocations(prev => [...prev, newLocation]);
        googleMapRef.current.setCenter(suggestion.position);
        googleMapRef.current.setZoom(15);
        
        const marker = createMarker(newLocation);
        if (marker) markersRef.current.push(marker);
        
        setSearchText(suggestion.display_name);
        setLoading(false);
        setSuggestions([]);
      } else {
        setLoading(false);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error selecting suggestion:", error);
      setLoading(false);
      setSuggestions([]);
    }
  };

  // Function to remove a location
  const removeLocation = (locationId) => {
    // Remove the marker from the map
    const markerIndex = markersRef.current.findIndex(marker => marker.id === locationId);
    if (markerIndex !== -1) {
      markersRef.current[markerIndex].marker.setMap(null);
      markersRef.current.splice(markerIndex, 1);
    }
    
    // Remove the location from the list
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  // Function to clear search field
  const clearSearch = () => {
    setSearchText('');
    setSuggestions([]);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Error message if it exists */}
      {mapError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '5px',
          zIndex: 2000,
          maxWidth: '80%',
          textAlign: 'center'
        }}>
          <h3>Error loading the map</h3>
          <p>{mapError}</p>
          <p>Suggestions: Verify your API key or reload the page</p>
        </div>
      )}
      
      {/* User help message */}
      <div style={{ 
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        Double-click anywhere on the map to select a location
      </div>
      
      {/* Search bar */}
      <div style={{ 
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
            placeholder="Search location (city, address, place)"
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
            Loading suggestions...
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
            {suggestions.map((suggestion, index) => (
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
                  {suggestion.type}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Google Maps container */}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f0f0f0'
        }}
      />
    </div>
  );
}