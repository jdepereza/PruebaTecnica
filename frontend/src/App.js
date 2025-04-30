import React, { useState, useEffect } from 'react';
import Mapa from './Mapa';
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
        <section className="card map-card" style={{ height: "600px", padding: 0, overflow: "hidden" }}>
          <div className="map-container" style={{ height: "100%", display: "flex", position: "relative" }}>
            <Mapa /> {/* Aquí se integra el componente del mapa Leaflet */}
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
        </div>
      </section>
    </div>
  );
}

export default App;