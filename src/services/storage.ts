import { API_BASE_URL } from '../config';

/**
 * Sube un archivo a la API local de NestJS utilizando Multer, guardándolo en la carpeta correspondiente.
 * Mantiene la compatibilidad de firma de Firebase para no romper el frontend.
 * @param clientId ID único de la carpeta (CAP)
 * @param stageFolder Carpeta de la etapa (ej. "etapa_2_documentacion")
 * @param fileType Nombre del tipo de archivo (ej. "informeCmf", "liquidacion", etc.)
 * @param file Objeto File a subir
 * @param onProgress Callback opcional para reportar el porcentaje de progreso (0 a 100)
 * @returns Promesa que resuelve a la URL local estática del archivo
 */
export const uploadClientFile = (
  clientId: string | number,
  stageFolder: string,
  fileType: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    // Endpoint de NestJS por ID dinámico
    const uploadUrl = `${API_BASE_URL}/clients/${clientId}/upload?stage=${stageFolder}&fileType=${fileType}`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);

    // Callback de progreso utilizando XMLHttpRequest
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          window.dispatchEvent(new Event('db-update'));
          resolve(response.url);
        } catch (err) {
          reject(new Error('No se pudo decodificar la respuesta del servidor.'));
        }
      } else {
        reject(new Error(`Error en la carga: ${xhr.statusText} (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Error de red durante la carga del archivo.'));
    };

    xhr.send(formData);
  });
};
