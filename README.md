# Documentación del Proyecto Fullstack

## Introducción
Este documento describe la estructura, funcionamiento y decisiones técnicas de una aplicación web fullstack desarrollada con Angular en el frontend y .NET en el backend. El enfoque es brindar una explicación clara y detallada con un tono apropiado para un estudiante universitario, siguiendo el formato APA.

## Estructura del Proyecto

### Frontend (Angular)
- **`src/index.html`**: Archivo principal HTML. Define el punto de entrada de la aplicación Angular. Contiene referencias a `styles.css` y `main.ts`.
- **`src/main.ts`**: Es el archivo principal de TypeScript que inicializa la aplicación Angular y carga el `AppModule`.
- **`src/app/app.module.ts`**: Declara los componentes utilizados en la aplicación y los módulos importados (por ejemplo, `HttpClientModule`, `FormsModule`).
- **`src/app/app.component.ts`**: Componente principal. Define la lógica general de la interfaz de usuario y es el controlador de eventos inicial.
- **`src/app/mapa`**: Contiene lógica relacionada con la visualización de mapas, usando Leaflet. `mapa.component.ts` carga el mapa y posiciona los marcadores.
- **`src/app/busqueda`**: Componente para realizar búsquedas. Se conecta con el backend para obtener resultados según filtros geográficos u otros criterios.

### Backend (.NET)
- **`Program.cs`**: Punto de entrada del backend en .NET. Configura servicios como CORS, rutas y controladores.
- **`Startup.cs`** *(si existe)*: Se usa para configurar los servicios (DI, middleware, etc.) y el pipeline HTTP.
- **Controladores (`Controllers/`)**: Reciben peticiones HTTP desde el frontend. Por ejemplo, `BusquedaController.cs` procesa búsquedas geoespaciales.
- **`appsettings.json`**: Archivo de configuración donde se definen valores como la cadena de conexión a la base de datos y claves API si son necesarias.

## Archivos CSS y JS
- **`styles.css` (Angular)**: Estilos globales para la aplicación. Define colores, fuentes y layout general.
- **`assets/js/leaflet.js` y `leaflet.css`**: Archivos de la librería Leaflet, utilizada para renderizar mapas interactivos.

## Decisiones Técnicas

### Elección de Leaflet sobre Google Maps
Se decidió utilizar **Leaflet** en lugar de Google Maps por las siguientes razones:
- **Licenciamiento y costos**: Google Maps tiene límites gratuitos mensuales y puede incurrir en costos si se exceden. Leaflet es de código abierto y gratuito.
- **Flexibilidad**: Leaflet permite personalización mediante plugins y es más liviano.

## Configuración de claves API
Aunque Leaflet no requiere clave API por defecto, si se usan mapas base de terceros (por ejemplo, Mapbox), puede ser necesario registrar una clave API y almacenarla en `environment.ts` (Angular) o `appsettings.json` (.NET).

**Ejemplo en Angular:**
```ts
export const environment = {
  production: false,
  mapApiKey: 'TU_CLAVE_API'
};
```

## Limitaciones y áreas de mejora
- **Mapas**: Actualmente, el sistema utiliza capas estáticas. Se podría mejorar usando tiles personalizados o mapas en 3D.
- **Seguridad**: Las claves API deben almacenarse de forma segura. Aún están expuestas en archivos del frontend.
- **Escalabilidad**: Las consultas al backend no están optimizadas para grandes volúmenes de datos.
- **Interfaz**: La interfaz puede mejorarse usando frameworks como Angular Material o Bootstrap para una mejor experiencia de usuario.

## Referencias
- Leaflet. (s.f.). *Leaflet - a JavaScript library for interactive maps*. https://leafletjs.com/
- Angular. (s.f.). *Angular Docs*. https://angular.io/
- Microsoft. (s.f.). *ASP.NET Core Documentation*. https://learn.microsoft.com/en-us/aspnet/core/

---
