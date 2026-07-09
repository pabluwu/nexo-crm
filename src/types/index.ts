import { Timestamp } from 'firebase/firestore';

export interface PersonalData {
  firstName: string;
  lastName: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
}

export type PipelineState =
  | 'reserva'
  | 'documentacion'
  | 'banca'
  | 'mutuaria'
  | 'promesa_solicitud'
  | 'promesa_firma'
  | 'contacto'
  | 'escritura'
  | 'cbr'
  | 'entrega'
  | 'cancelado';

export interface StageReserva {
  fichaClienteUrl: string;
  fotoCarnetUrl: string;
  comprobanteReservaUrl: string;
  completedAt: Timestamp;
  completedBy: string;
}

export interface DocumentInfo {
  url: string;
  uploadedAt: Timestamp;
  fileName: string;
}

export interface StageDocumentacion {
  liquidacionesSueldo: DocumentInfo[];
  informeCmf?: DocumentInfo;
  cotizacionesAfp?: DocumentInfo;
  certificadoTitulo?: DocumentInfo;
  semaphoreStatus: 'red' | 'yellow' | 'green';
  completedAt?: Timestamp;
}

export interface StagePromesaSolicitud {
  cotizacionInmobiliariaUrl: string;
  approvedCreditDocumentUrl: string;
  sentAt: Timestamp;
  sentBy: string;
}

export interface StagePromesaFirma {
  promesaFirmadaUrl: string;
  signedAt: Timestamp;
  signedBy: string;
}

export interface StageEscritura {
  escrituraFirmadaUrl?: string;
  signedAt: Timestamp;
  signedBy: string;
}

export interface StageCbr {
  cbrStatus: string;
  completedAt: Timestamp;
}

export interface StageEntrega {
  notes?: string;
  deliveredAt: Timestamp;
  deliveredBy: string;
}

export interface ClientStages {
  reserva?: StageReserva;
  documentacion?: StageDocumentacion;
  promesaSolicitud?: StagePromesaSolicitud;
  promesaFirma?: StagePromesaFirma;
  escritura?: StageEscritura;
  cbr?: StageCbr;
  entrega?: StageEntrega;
}

export interface ApprovalResolution {
  approvedByType: 'bank' | 'mutuaria';
  approvedEntityId: string;
  approvalDate: Timestamp;
}

export interface ClientCancelation {
  reason: string;
  stageAtCancelation: PipelineState;
  canceledAt: Timestamp;
  canceledBy: string;
}

export interface ClientDocument {
  id?: number;
  personalData: PersonalData;
  pipelineState: PipelineState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  stages: ClientStages;
  approvalResolution?: ApprovalResolution;
  cancelation?: ClientCancelation;
}

export interface BankEvaluationHistory {
  requestedDocName: string;
  submittedDocUrl: string;
  submittedAt: Timestamp;
  observation?: string;
}

export type EvaluationStatus = 'pending' | 'approved' | 'rejected' | 'more_documents';

export interface BankEvaluationDocument {
  bankId: string;
  bankName: string;
  uploadedAt: Timestamp;
  status: EvaluationStatus;
  responseDate: Timestamp | null;
  history: BankEvaluationHistory[];
}

export interface MutuariaEvaluationDocument {
  mutuariaId: string;
  mutuariaName: string;
  uploadedAt: Timestamp;
  status: EvaluationStatus;
  responseDate: Timestamp | null;
  history: BankEvaluationHistory[];
}

export interface MilestoneDocument {
  date: Timestamp;
  observation: string;
  registeredBy: string;
  registeredById: string;
  stage: string;
}
