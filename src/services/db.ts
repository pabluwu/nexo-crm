import type { PersonalData, PipelineState, EvaluationStatus, BankEvaluationHistory } from '../types';
import { API_BASE_URL } from '../config';

// Helper genérico para peticiones HTTP
const request = async (path: string, method: string = 'GET', body?: any) => {
  // Obtener el correo del usuario logueado desde localStorage
  const savedUserStr = localStorage.getItem('nexoprop_user');
  let userEmail = '';
  if (savedUserStr) {
    try {
      const u = JSON.parse(savedUserStr);
      userEmail = u.email || '';
    } catch (e) {
      console.warn('No se pudo decodificar el usuario guardado:', e);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (userEmail) {
    headers['x-user-email'] = userEmail;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, options);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Http error: ${res.status}`);
  }
  const data = await res.json();
  if (method !== 'GET') {
    window.dispatchEvent(new Event('db-update'));
  }
  return data;
};

// Crear un nuevo cliente en el pipeline (API NestJS)
export const createClient = async (rut: string, personalData: PersonalData, createdBy: string) => {
  const cleanRut = rut.trim().toLowerCase().replace(/\./g, '');
  return request('/clients', 'POST', {
    rut: cleanRut,
    personalData,
    createdBy
  });
};

// Actualizar el estado general del pipeline del expediente por ID
export const updateClientState = async (clientId: number | string, nextState: PipelineState) => {
  return request(`/clients/${clientId}/state`, 'PUT', {
    pipelineState: nextState
  });
};

// Completar la reserva (Etapa 1)
export const completeReservaStage = async (
  _clientId: number | string,
  _urls: { fichaClienteUrl: string; fotoCarnetUrl: string; comprobanteReservaUrl: string },
  _userId: string
) => {
  // Las URLs ya fueron guardadas en MariaDB mediante las cargas de archivos. 
  // El avance es manual desde el Stepper.
  return Promise.resolve({ success: true });
};

// Guardado parcial de documentos individuales en Etapa 2
export const updateStageDocumentation = async (
  _clientId: number | string,
  _field: 'informeCmf' | 'cotizacionesAfp' | 'certificadoTitulo',
  _fileData: { url: string; fileName: string }
) => {
  // Los documentos ya se registran y guardan al subirse mediante el endpoint de upload.
  return Promise.resolve({ success: true });
};

// Agregar Liquidación a la Etapa 2
export const addSalaryPayslip = async (_clientId: number | string, _fileData: { url: string; fileName: string }) => {
  // Se registra al subir la liquidación mediante el endpoint de upload.
  return Promise.resolve({ success: true });
};

// Eliminar todos los archivos cargados en la documentación por ID de expediente
export const clearDocumentationStage = async (clientId: number | string) => {
  return request(`/clients/${clientId}/documentation/clear`, 'DELETE');
};

// Crear o actualizar una evaluación bancaria por ID de expediente
export const setBankEvaluation = async (
  clientId: number | string,
  bankId: string,
  bankName: string,
  status: EvaluationStatus,
  historyItem?: BankEvaluationHistory
) => {
  // 1. Guardar la evaluación básica
  await request(`/clients/${clientId}/evaluations`, 'POST', {
    entityId: bankId,
    entityName: bankName,
    entityType: 'bank',
    status
  });

  // 2. Si viene un hito de historial (documento adicional), guardarlo
  if (historyItem) {
    await request(`/clients/${clientId}/evaluations/${bankId}/history`, 'POST', {
      requestedDocName: historyItem.requestedDocName,
      submittedDocUrl: historyItem.submittedDocUrl,
      observation: historyItem.observation
    });
  }

  return { success: true };
};

// Seleccionar el banco aprobador y avanzar a Etapa 5 por ID de expediente
export const selectApprovedBankAndAdvance = async (
  clientId: number | string,
  bankId: string,
  userId: string
) => {
  return request(`/clients/${clientId}/evaluations/approve`, 'POST', {
    approvedByType: 'bank',
    approvedEntityId: bankId,
    updatedBy: userId
  });
};

// Crear o actualizar una evaluación de mutuaria por ID de expediente
export const setMutuariaEvaluation = async (
  clientId: number | string,
  mutuariaId: string,
  mutuariaName: string,
  status: EvaluationStatus,
  historyItem?: BankEvaluationHistory
) => {
  await request(`/clients/${clientId}/evaluations`, 'POST', {
    entityId: mutuariaId,
    entityName: mutuariaName,
    entityType: 'mutuaria',
    status
  });

  if (historyItem) {
    await request(`/clients/${clientId}/evaluations/${mutuariaId}/history`, 'POST', {
      requestedDocName: historyItem.requestedDocName,
      submittedDocUrl: historyItem.submittedDocUrl,
      observation: historyItem.observation
    });
  }

  return { success: true };
};

// Seleccionar la mutuaria aprobadora y avanzar a Etapa 5 por ID de expediente
export const selectApprovedMutuariaAndAdvance = async (
  clientId: number | string,
  mutuariaId: string,
  userId: string
) => {
  return request(`/clients/${clientId}/evaluations/approve`, 'POST', {
    approvedByType: 'mutuaria',
    approvedEntityId: mutuariaId,
    updatedBy: userId
  });
};

// Guardar Solicitud de Promesa (Etapa 5) por ID de expediente
export const savePromesaSolicitud = async (
  clientId: number | string,
  _urls: { cotizacionInmobiliariaUrl: string; approvedCreditDocumentUrl: string },
  _userId: string
) => {
  return updateClientState(clientId, 'promesa_firma');
};

// Guardar Firma de Promesa (Etapa 6) por ID de expediente
export const savePromesaFirma = async (clientId: number | string, _promesaFirmadaUrl: string, _userId: string) => {
  return updateClientState(clientId, 'contacto');
};

// Guardar Firma de Escritura (Etapa 8) por ID de expediente
export const saveEscrituraFirma = async (clientId: number | string, _escrituraFirmadaUrl: string | undefined, _userId: string) => {
  return updateClientState(clientId, 'cbr');
};

// Guardar Conservador de Bienes Raíces (Etapa 9) por ID de expediente
export const saveCbrStatus = async (clientId: number | string, cbrStatus: string) => {
  await addMilestone(clientId, `INSCRIPCIÓN CBR: ${cbrStatus}`, 'Sistema CBR', 'system-uid', 'cbr');
  return updateClientState(clientId, 'entrega');
};

// Registrar la entrega física del departamento (Etapa 10) por ID de expediente
export const completeEntregaStage = async (clientId: number | string, notes: string, userId: string) => {
  await addMilestone(clientId, `DEPARTAMENTO ENTREGADO. Notas: ${notes}`, 'Ejecutivo Entrega', userId, 'entrega');
  return updateClientState(clientId, 'entrega');
};

// Registrar Hito en la Bitácora por ID de expediente
export const addMilestone = async (
  clientId: number | string,
  observation: string,
  userName: string,
  userId: string,
  stage: string
) => {
  return request(`/clients/${clientId}/milestones`, 'POST', {
    observation,
    registeredBy: userName,
    registeredById: userId,
    stage
  });
};

// Dar de baja el expediente comercial por algún motivo (Cierre de carpeta) por ID
export const cancelClientFolder = async (
  clientId: number | string,
  reason: string,
  currentStage: PipelineState,
  _userId: string,
  userName: string
) => {
  return request(`/clients/${clientId}/cancel`, 'POST', {
    reason,
    stageAtCancelation: currentStage,
    canceledBy: userName
  });
};
