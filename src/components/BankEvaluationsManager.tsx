import React, { useState } from 'react';
import { useClientPipeline } from '../context/ClientPipelineContext';
import { setBankEvaluation, setMutuariaEvaluation, selectApprovedBankAndAdvance, selectApprovedMutuariaAndAdvance } from '../services/db';
import { uploadClientFile } from '../services/storage';
import type { EvaluationStatus } from '../types';
import { Building2, Plus, CheckCircle, FileText, Calendar, Send, Loader2 } from 'lucide-react';

const PREDEFINED_BANKS = [
  { id: 'chile', name: 'Banco de Chile' },
  { id: 'santander', name: 'Banco Santander' },
  { id: 'scotiabank', name: 'Scotiabank' },
  { id: 'bci', name: 'Banco BCI' },
  { id: 'itau', name: 'Banco Itaú' },
  { id: 'estado', name: 'Banco Estado' }
];

const PREDEFINED_MUTUARIAS = [
  { id: 'metlife', name: 'MetLife Mutuaria' },
  { id: 'security', name: 'Mutuaria Security' },
  { id: 'bice', name: 'Mutuaria BICE' },
  { id: 'principal', name: 'Principal Mutuaria' }
];

export const BankEvaluationsManager: React.FC = () => {
  const { client, clientRut, bankEvaluations, mutuariaEvaluations } = useClientPipeline();
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Estados para solicitud de documentación adicional
  const [activeReqEntityId, setActiveReqEntityId] = useState<string | null>(null);
  const [docRequestName, setDocRequestName] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submittingDoc, setSubmittingDoc] = useState(false);

  if (!client) return null;

  const isBankStage = client.pipelineState === 'banca';
  const isMutuariaStage = client.pipelineState === 'mutuaria';

  if (!isBankStage && !isMutuariaStage) return null;

  const listOptions = isBankStage ? PREDEFINED_BANKS : PREDEFINED_MUTUARIAS;
  const currentEvals = isBankStage ? bankEvaluations : mutuariaEvaluations;
  const stageFolderName = isBankStage ? 'etapa_3_banca' : 'etapa_4_mutuaria';

  const handleAddEntity = async () => {
    if (!selectedEntityId) return;
    const entity = listOptions.find((e) => e.id === selectedEntityId);
    if (!entity) return;

    try {
      if (isBankStage) {
        await setBankEvaluation(clientRut, entity.id, entity.name, 'pending');
      } else {
        await setMutuariaEvaluation(clientRut, entity.id, entity.name, 'pending');
      }
      setSelectedEntityId('');
    } catch (err) {
      console.error("Error al registrar entidad: ", err);
    }
  };

  const handleUpdateStatus = async (entityId: string, entityName: string, status: EvaluationStatus) => {
    setUpdatingId(entityId);
    try {
      if (isBankStage) {
        await setBankEvaluation(clientRut, entityId, entityName, status);
      } else {
        await setMutuariaEvaluation(clientRut, entityId, entityName, status);
      }
    } catch (err) {
      console.error("Error al actualizar estado: ", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSelectApprovedEntity = async (entityId: string) => {
    try {
      if (isBankStage) {
        await selectApprovedBankAndAdvance(clientRut, entityId, 'SYSTEM_USER');
      } else {
        await selectApprovedMutuariaAndAdvance(clientRut, entityId, 'SYSTEM_USER');
      }
    } catch (err) {
      console.error("Error al designar aprobación de crédito: ", err);
    }
  };

  const handleUploadAdditionalDoc = async (entityId: string, entityName: string) => {
    if (!docRequestName.trim() || !fileToUpload) return;

    setSubmittingDoc(true);
    setUploadProgress(0);

    try {
      // 1. Subir archivo a Storage
      const cleanFileName = `${Date.now()}_${fileToUpload.name.replace(/\s+/g, '_')}`;
      const fileUrl = await uploadClientFile(
        clientRut,
        `${stageFolderName}/${entityId}`,
        cleanFileName,
        fileToUpload,
        (progress) => setUploadProgress(Math.round(progress))
      );

      // 2. Guardar en el historial de la subcolección en Firestore
      const historyItem = {
        requestedDocName: docRequestName,
        submittedDocUrl: fileUrl,
        submittedAt: null as any // Se calcula en el servidor
      };

      if (isBankStage) {
        await setBankEvaluation(clientRut, entityId, entityName, 'more_documents', historyItem);
      } else {
        await setMutuariaEvaluation(clientRut, entityId, entityName, 'more_documents', historyItem);
      }

      // Limpiar estados
      setDocRequestName('');
      setFileToUpload(null);
      setActiveReqEntityId(null);
    } catch (err) {
      console.error("Error al cargar documentación adicional: ", err);
    } finally {
      setSubmittingDoc(false);
      setUploadProgress(0);
    }
  };

  // Filtrar entidades que no han sido añadidas al listado del cliente todavía
  const availableEntities = listOptions.filter(
    (item) => !currentEvals.some((ev) => (ev as any).bankId === item.id || (ev as any).mutuariaId === item.id)
  );

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/80 flex flex-col gap-6 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            {isBankStage ? 'Evaluaciones Bancarias (Multi-banco)' : 'Evaluaciones de Mutuarias (Contingencia)'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isBankStage 
              ? 'Registra las evaluaciones en los distintos bancos. Al menos uno debe estar Aprobado para continuar.'
              : 'Registra las evaluaciones en las mutuarias. Si todas rechazan, el proceso se dará de baja.'}
          </p>
        </div>

        {/* Agregar Entidad */}
        {availableEntities.length > 0 && (
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 flex-1 sm:flex-initial"
            >
              <option value="">{isBankStage ? '-- Seleccionar Banco --' : '-- Seleccionar Mutuaria --'}</option>
              {availableEntities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddEntity}
              disabled={!selectedEntityId}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                selectedEntityId
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Listado de Evaluaciones Activas */}
      {currentEvals.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <p className="text-slate-400 text-sm font-medium">No se han registrado evaluaciones en esta etapa.</p>
          <p className="text-xs text-slate-400/80 mt-1">Selecciona una entidad en la esquina superior para comenzar.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {currentEvals.map((evaluation) => {
            const id = (evaluation as any).bankId || (evaluation as any).mutuariaId;
            const name = (evaluation as any).bankName || (evaluation as any).mutuariaName;
            const status = evaluation.status;
            
            return (
              <div
                key={id}
                className={`p-5 rounded-2xl border transition-all duration-300 ${
                  status === 'approved' ? 'bg-emerald-50/40 border-emerald-200/60' :
                  status === 'rejected' ? 'bg-rose-50/40 border-rose-200/60' :
                  status === 'more_documents' ? 'bg-amber-50/40 border-amber-200/60' :
                  'bg-white border-slate-100/90 shadow-sm'
                }`}
              >
                {/* Cabecera de Fila */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                      status === 'more_documents' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">{name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                         Enviado el: {evaluation.uploadedAt ? new Date(evaluation.uploadedAt.seconds * 1000).toLocaleDateString() : 'Cargando...'}
                      </div>
                    </div>
                  </div>

                  {/* Estado / Acciones */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                    {/* Select para cambiar estado */}
                    <select
                      value={status}
                      disabled={updatingId === id}
                      onChange={(e) => handleUpdateStatus(id, name, e.target.value as EvaluationStatus)}
                      className={`text-xs font-semibold rounded-xl border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100/50 ${
                        status === 'approved' ? 'bg-emerald-100/50 border-emerald-200 text-emerald-800 font-bold' :
                        status === 'rejected' ? 'bg-rose-100/50 border-rose-200 text-rose-800' :
                        status === 'more_documents' ? 'bg-amber-100/50 border-amber-200 text-amber-800' :
                        'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="approved">Aprobado</option>
                      <option value="rejected">Rechazado</option>
                      <option value="more_documents">Solicitó más doc.</option>
                    </select>

                    {/* Botón de Selección del Aprobador Final */}
                    {status === 'approved' && (
                      <button
                        onClick={() => handleSelectApprovedEntity(id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Usar Aprobación
                      </button>
                    )}
                  </div>
                </div>

                {/* Historial de Documentos Adicionales */}
                {evaluation.history && evaluation.history.length > 0 && (
                  <div className="mt-4 border-t border-slate-100/80 pt-3">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Historial de Documentos Extra</h5>
                    <div className="flex flex-col gap-2">
                      {evaluation.history.map((hist, hIdx) => (
                        <div key={hIdx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-semibold text-slate-700">{hist.requestedDocName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Subido el: {hist.submittedAt ? new Date(hist.submittedAt.seconds * 1000).toLocaleString() : 'Cargando...'}
                            </p>
                          </div>
                          <a
                            href={hist.submittedDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg transition-all font-medium"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            Ver Archivo
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulario para subir más documentación si se requiere */}
                {status === 'more_documents' && (
                  <div className="mt-4 border-t border-slate-100/80 pt-4">
                    {activeReqEntityId !== id ? (
                      <button
                        onClick={() => {
                          setActiveReqEntityId(id);
                          setDocRequestName('');
                          setFileToUpload(null);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Cargar Documento Solicitado
                      </button>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Subir Documentación Requerida</span>
                          <button
                            onClick={() => setActiveReqEntityId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                          >
                            Cancelar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nombre del Documento Solicitado</label>
                            <input
                              type="text"
                              placeholder="Ej. Declaración de Impuestos 2025"
                              value={docRequestName}
                              onChange={(e) => setDocRequestName(e.target.value)}
                              disabled={submittingDoc}
                              className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Seleccionar Archivo (PDF/Imagen)</label>
                            <input
                              type="file"
                              accept=".pdf, image/*"
                              disabled={submittingDoc}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setFileToUpload(e.target.files[0]);
                                }
                              }}
                              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end items-center gap-3 border-t border-slate-200/60 pt-3 mt-1">
                          {submittingDoc && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                              Cargando... {uploadProgress}%
                            </div>
                          )}
                          <button
                            onClick={() => handleUploadAdditionalDoc(id, name)}
                            disabled={!docRequestName.trim() || !fileToUpload || submittingDoc}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                              docRequestName.trim() && fileToUpload && !submittingDoc
                                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Enviar Documento
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
