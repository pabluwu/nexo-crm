// Configuración dinámica de Dominios para Entornos Local y Producción
export const API_BASE_URL = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' || 
  window.location.hostname === 'test-nexo.acuerdalo.cl'
    ? 'https://api-michelle.acuerdalo.cl/api'
    : 'https://api-michelle.acuerdalo.cl/api';

export const UPLOADS_BASE_URL = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' || 
  window.location.hostname === 'test-nexo.acuerdalo.cl'
    ? 'https://api-michelle.acuerdalo.cl/uploads'
    : 'https://api-michelle.acuerdalo.cl/uploads';

