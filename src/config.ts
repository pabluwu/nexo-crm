// Configuración dinámica de Dominios para Entornos Local y Producción usando variables de entorno
export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.hostname === 'test-nexo.acuerdalo.cl'
    ? 'http://localhost:3000/api'
    : 'https://api-michelle.acuerdalo.cl/api');

export const UPLOADS_BASE_URL = 
  import.meta.env.VITE_UPLOADS_BASE_URL || 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.hostname === 'test-nexo.acuerdalo.cl'
    ? 'http://localhost:3000/uploads'
    : 'https://api-michelle.acuerdalo.cl/uploads');
