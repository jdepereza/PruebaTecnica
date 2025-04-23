import React, { useState, useEffect } from 'react';
import Mapa from './Mapa';
import GoogleMapa from './GoogleMap';
import LeafletSearchMap from './LeafletSearchMap'; // Aquí se usa para la búsqueda con Leaflet
import './App.css';

function App() {
  const [mensaje, setMensaje] = useState('');
  const [view, setView] = useState('home'); // Estado para controlar la vista

  // Conexión al backend (mensaje desde backend)
  useEffect(() => {
    fetch('http://localhost:5000/api/hello')
      .then((res) => res.json())
      .then((data) => setMensaje(data.message))
      .catch(() => setMensaje('Error conectando al backend'));
  }, []);

  // Vista cuando seleccionas el mapa normal
  if (view === 'map') {
    return (
      <div className="App">
        <header className="header">
          <h1>Mi Mapa Leaflet</h1>
        </header>
        <section className="card map-card">
          <div className="map-container">
            <Mapa /> {/* Aquí se integra el componente del mapa Leaflet */}
          </div>
        </section>
        <button className="btn" onClick={() => setView('home')}>← Volver</button>
      </div>
    );
  }

  // Vista cuando seleccionas el mapa con búsqueda
  if (view === 'google') {
    return (
      <div className="App">
        <header className="header">
          <h1>Mi Búsqueda Leaflet</h1>
        </header>
        <section className="card map-card">
          <div className="map-container">
            <GoogleMapa /> {/* Aquí se integra la búsqueda de ubicaciones en el mapa */}
          </div>
        </section>
        <button className="btn" onClick={() => setView('home')}>← Volver</button>
      </div>
    );
  }

  // Vista principal con botones para redirigir
  return (
    <div className="App">
      <header className="header">
        <h1>Página Principal</h1>
      </header>

      <section className="card">
        <h2>Mensaje del Backend</h2>
        <p className="message">{mensaje}</p>
      </section>

      <section className="card">
        <h2>Acciones</h2>
        <div className="btn-group">
          <button className="btn" onClick={() => setView('map')}>
            Ver Mapa Leaflet
          </button>
          {/*
          <button className="btn" onClick={() => setView('google')}>
            Ver Mapa Google
          </button>*/}
        </div>
      </section>
    </div>
  );
}

export default App;
