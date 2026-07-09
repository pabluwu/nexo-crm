import React, { useState } from 'react';
import { useClientPipeline } from '../context/ClientPipelineContext';
import { 
  completeReservaStage, 
  updateStageDocumentation, 
  addSalaryPayslip, 
  clearDocumentationStage,
  savePromesaSolicitud, 
  savePromesaFirma, 
  saveEscrituraFirma, 
  saveCbrStatus, 
  completeEntregaStage,
  updateClientState
} from '../services/db';
import { uploadClientFile } from '../services/storage';
import { DocumentSemaphore } from './DocumentSemaphore';
import { BankEvaluationsManager } from './BankEvaluationsManager';
import { 
  FileText, Upload, CheckCircle, ArrowRight, 
  FileCheck, FileClock, Trash2, Landmark, Stamp, Check 
} from 'lucide-react';

export const StageRenderer: React.FC = () => {
  const { client, clientRut, viewedStage } = useClientPipeline();
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Estados locales para formularios de etapa
  const [cbrText, setCbrText] = useState('');
  const [entregaNotes, setEntregaNotes] = useState('');

  if (!client) return null;

  const currentStage = viewedStage;

  // Helper genérico para subir archivo y guardar en Firestore
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    stageFolder: string, 
    fieldName: string, 
    uploadType: 'reserva' | 'documentacion' | 'promesa' | 'promesa_firma' | 'escritura'
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingField(fieldName);
    setProgress(0);

    try {
      const url = await uploadClientFile(clientRut, stageFolder, fieldName, file, (p) => {
        setProgress(Math.round(p));
      });

      // Guardar URL en base de datos según el caso
      if (uploadType === 'reserva') {
        const currentReserva = client.stages?.reserva || { fichaClienteUrl: '', fotoCarnetUrl: '', comprobanteReservaUrl: '' };
        await completeReservaStage(clientRut, {
          ...currentReserva,
          [fieldName]: url
        }, 'SYSTEM_USER');
      } 
      else if (uploadType === 'documentacion') {
        if (fieldName === 'liquidacion') {
          await addSalaryPayslip(clientRut, { url, fileName: file.name });
        } else {
          await updateStageDocumentation(
            clientRut, 
            fieldName as 'informeCmf' | 'cotizacionesAfp' | 'certificadoTitulo', 
            { url, fileName: file.name }
          );
        }
      }
    } catch (err) {
      console.error("Error al cargar archivo:", err);
      alert("Hubo un error al subir el archivo. Revisa la consola.");
    } finally {
      setUploadingField(null);
      setProgress(0);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ----------------- ETAPA 1: RESERVA ----------------- */}
      {currentStage === 'reserva' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Etapa 1: Apertura de Reserva</h3>
            <p className="card-subtitle">Adjunta los documentos de reserva iniciales para habilitar la recepción documental.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
            {/* Ficha Cliente */}
            <div className="upload-box">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">1. Ficha del Cliente</span>
              {client.stages?.reserva?.fichaClienteUrl ? (
                <div className="file-pill-active">
                  <FileCheck className="w-8 h-8 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold truncate max-w-full text-slate-800">Ficha Guardada</span>
                  <a href={client.stages.reserva.fichaClienteUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-2">Visualizar</a>
                </div>
              ) : (
                <label className="file-uploader-label">
                  {uploadingField === 'fichaClienteUrl' ? (
                    <div className="flex flex-col items-center"><span className="loader" /> <span className="text-[10px] text-slate-400 mt-2">Cargando {progress}%</span></div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-600">Subir Ficha</span>
                      <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_1_reserva', 'fichaClienteUrl', 'reserva')} />
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Foto Carnet */}
            <div className="upload-box">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">2. Foto Cédula Identidad</span>
              {client.stages?.reserva?.fotoCarnetUrl ? (
                <div className="file-pill-active">
                  <FileCheck className="w-8 h-8 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold truncate max-w-full text-slate-800">Carnet Guardado</span>
                  <a href={client.stages.reserva.fotoCarnetUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-2">Visualizar</a>
                </div>
              ) : (
                <label className="file-uploader-label">
                  {uploadingField === 'fotoCarnetUrl' ? (
                    <div className="flex flex-col items-center"><span className="loader" /> <span className="text-[10px] text-slate-400 mt-2">Cargando {progress}%</span></div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-600">Subir Cédula</span>
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_1_reserva', 'fotoCarnetUrl', 'reserva')} />
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Comprobante Reserva */}
            <div className="upload-box">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">3. Comprobante de Pago</span>
              {client.stages?.reserva?.comprobanteReservaUrl ? (
                <div className="file-pill-active">
                  <FileCheck className="w-8 h-8 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold truncate max-w-full text-slate-800">Abono Registrado</span>
                  <a href={client.stages.reserva.comprobanteReservaUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-2">Visualizar</a>
                </div>
              ) : (
                <label className="file-uploader-label">
                  {uploadingField === 'comprobanteReservaUrl' ? (
                    <div className="flex flex-col items-center"><span className="loader" /> <span className="text-[10px] text-slate-400 mt-2">Cargando {progress}%</span></div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-600">Subir Recibo</span>
                      <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_1_reserva', 'comprobanteReservaUrl', 'reserva')} />
                    </>
                  )}
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ETAPA 2: RECEPCIÓN DOCUMENTACIÓN ----------------- */}
      {(currentStage === 'documentacion' || (client.stages?.documentacion && currentStage !== 'reserva')) && (
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <div>
              <h3 className="card-title">Etapa 2: Acreditación Financiera y Documentación</h3>
              <p className="card-subtitle">Carga los documentos del cliente para evaluar su capacidad de financiamiento.</p>
            </div>
            {currentStage === 'documentacion' && (
              <button onClick={() => clearDocumentationStage(clientRut)} className="btn-danger flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Reiniciar Carpeta
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-6">
            <DocumentSemaphore />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Liquidaciones de sueldo */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[220px]">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Liquidaciones de Sueldo</h4>
                  <p className="text-[10px] text-slate-400 leading-tight mb-3">Se requieren 6 liquidaciones mensuales consecutivas.</p>
                  
                  <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                    {(client.stages?.documentacion?.liquidacionesSueldo || []).map((liq, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white border border-slate-100/90 rounded-lg p-1.5 text-[11px] shadow-sm">
                        <span className="truncate max-w-[80px] font-medium text-slate-700">{liq.fileName}</span>
                        <a href={liq.url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">Ver</a>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  {((client.stages?.documentacion?.liquidacionesSueldo?.length || 0) < 6) ? (
                    <label className="file-uploader-mini">
                      {uploadingField === 'liquidacion' ? (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1.5"><span className="loader-mini" /> {progress}%</span>
                      ) : (
                        <>
                          <Upload className="w-4.5 h-4.5" /> Subir Liquidación ({client.stages?.documentacion?.liquidacionesSueldo?.length || 0}/6)
                          <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_2_documentacion/liquidaciones', 'liquidacion', 'documentacion')} />
                        </>
                      )}
                    </label>
                  ) : (
                    <span className="success-tag flex justify-center items-center gap-1"><Check className="w-3.5 h-3.5" /> Requisito Cumplido</span>
                  )}
                </div>
              </div>

              {/* Informe CMF */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[220px]">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Informe Deudas CMF</h4>
                  <p className="text-[10px] text-slate-400 leading-tight mb-3">Reporte consolidado de deudas bancarias y comerciales.</p>

                  {client.stages?.documentacion?.informeCmf ? (
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center text-center mt-2 shadow-sm">
                      <FileCheck className="w-8 h-8 text-emerald-600 mb-1" />
                      <span className="text-[11px] font-bold text-slate-800 truncate max-w-full">{client.stages.documentacion.informeCmf.fileName}</span>
                      <a href={client.stages.documentacion.informeCmf.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-2">Visualizar</a>
                    </div>
                  ) : (
                    <div className="bg-slate-100/40 border border-slate-200/50 rounded-xl p-6 flex flex-col items-center justify-center text-center mt-2">
                      <FileClock className="w-8 h-8 text-slate-300" />
                      <span className="text-[10px] text-slate-400 mt-2">CMF Pendiente</span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <label className="file-uploader-mini">
                    {uploadingField === 'informeCmf' ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5"><span className="loader-mini" /> {progress}%</span>
                    ) : (
                      <>
                        <Upload className="w-4.5 h-4.5" /> {client.stages?.documentacion?.informeCmf ? 'Reemplazar' : 'Subir CMF'}
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_2_documentacion', 'informeCmf', 'documentacion')} />
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Cotizaciones AFP */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[220px]">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cotizaciones AFP</h4>
                  <p className="text-[10px] text-slate-400 leading-tight mb-3">Certificado de las últimas 24 cotizaciones previsionales.</p>

                  {client.stages?.documentacion?.cotizacionesAfp ? (
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center text-center mt-2 shadow-sm">
                      <FileCheck className="w-8 h-8 text-emerald-600 mb-1" />
                      <span className="text-[11px] font-bold text-slate-800 truncate max-w-full">{client.stages.documentacion.cotizacionesAfp.fileName}</span>
                      <a href={client.stages.documentacion.cotizacionesAfp.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-2">Visualizar</a>
                    </div>
                  ) : (
                    <div className="bg-slate-100/40 border border-slate-200/50 rounded-xl p-6 flex flex-col items-center justify-center text-center mt-2">
                      <FileClock className="w-8 h-8 text-slate-300" />
                      <span className="text-[10px] text-slate-400 mt-2">AFP Pendiente</span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <label className="file-uploader-mini">
                    {uploadingField === 'cotizacionesAfp' ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5"><span className="loader-mini" /> {progress}%</span>
                    ) : (
                      <>
                        <Upload className="w-4.5 h-4.5" /> {client.stages?.documentacion?.cotizacionesAfp ? 'Reemplazar' : 'Subir AFP'}
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_2_documentacion', 'cotizacionesAfp', 'documentacion')} />
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Certificado de Título (Opcional) */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título Profesional</h4>
                    <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Opcional</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight mb-3">Acreditación de título para complementar evaluación bancaria.</p>

                  {client.stages?.documentacion?.certificadoTitulo ? (
                    <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3 flex flex-col items-center justify-center text-center mt-2 shadow-sm">
                      <FileCheck className="w-8 h-8 text-blue-600 mb-1" />
                      <span className="text-[11px] font-bold text-slate-800 truncate max-w-full">{client.stages.documentacion.certificadoTitulo.fileName}</span>
                      <a href={client.stages.documentacion.certificadoTitulo.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-2">Visualizar</a>
                    </div>
                  ) : (
                    <div className="bg-slate-100/40 border border-slate-200/50 rounded-xl p-6 flex flex-col items-center justify-center text-center mt-2">
                      <FileClock className="w-8 h-8 text-slate-300" />
                      <span className="text-[10px] text-slate-400 mt-2">No Adjunto</span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <label className="file-uploader-mini">
                    {uploadingField === 'certificadoTitulo' ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5"><span className="loader-mini" /> {progress}%</span>
                    ) : (
                      <>
                        <Upload className="w-4.5 h-4.5" /> {client.stages?.documentacion?.certificadoTitulo ? 'Reemplazar' : 'Subir Título'}
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_2_documentacion', 'certificadoTitulo', 'documentacion')} />
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ETAPA 3 & 4: EVALUACIONES ----------------- */}
      {(currentStage === 'banca' || currentStage === 'mutuaria') && (
        <BankEvaluationsManager />
      )}

      {/* ----------------- ETAPA 5: SOLICITUD DE PROMESA ----------------- */}
      {currentStage === 'promesa_solicitud' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Etapa 5: Solicitud de Promesa (Inmobiliaria)</h3>
            <p className="card-subtitle">
              Genera el expediente formal de promesa. El Rut y Cédula se rescatan automáticamente del expediente de Reserva. 
              Debes adjuntar la Cotización Formal y el documento de aprobación crediticia.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-5">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 flex flex-col gap-2">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Documentos Rescatados del Expediente:</span>
              <div className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-xl">
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> Cédula de Identidad del Cliente</span>
                {client.stages?.reserva?.fotoCarnetUrl ? (
                  <a href={client.stages.reserva.fotoCarnetUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Ver Documento</a>
                ) : (
                  <span className="text-rose-600">Error: No encontrado</span>
                )}
              </div>
              <div className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-xl">
                <span className="flex items-center gap-1.5"><Landmark className="w-4 h-4 text-slate-400" /> Entidad Aprobatoria ({client.approvalResolution?.approvedByType === 'bank' ? 'Banco' : 'Mutuaria'})</span>
                <span className="font-bold text-slate-800 uppercase">{client.approvalResolution?.approvedEntityId}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
              {/* Cotización Inmobiliaria */}
              <div className="upload-box">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">1. Cotización Formal Inmobiliaria</span>
                {client.stages?.promesaSolicitud?.cotizacionInmobiliariaUrl ? (
                  <div className="file-pill-active">
                    <FileCheck className="w-8 h-8 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold truncate max-w-full text-slate-800">Cotización Cargada</span>
                    <a href={client.stages.promesaSolicitud.cotizacionInmobiliariaUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-2">Visualizar</a>
                  </div>
                ) : (
                  <label className="file-uploader-label">
                    {uploadingField === 'cotizacionInmobiliariaUrl' ? (
                      <div className="flex flex-col items-center"><span className="loader" /> <span className="text-[10px] text-slate-400 mt-2">Cargando {progress}%</span></div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">Subir Cotización</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_5_promesa', 'cotizacionInmobiliariaUrl', 'reserva')} />
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Documento de Aprobación Formal */}
              <div className="upload-box">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">2. Carta Aprobación de Crédito</span>
                {client.stages?.promesaSolicitud?.approvedCreditDocumentUrl ? (
                  <div className="file-pill-active">
                    <FileCheck className="w-8 h-8 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold truncate max-w-full text-slate-800">Carta Aprobación Cargada</span>
                    <a href={client.stages.promesaSolicitud.approvedCreditDocumentUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-2">Visualizar</a>
                  </div>
                ) : (
                  <label className="file-uploader-label">
                    {uploadingField === 'approvedCreditDocumentUrl' ? (
                      <div className="flex flex-col items-center"><span className="loader" /> <span className="text-[10px] text-slate-400 mt-2">Cargando {progress}%</span></div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">Subir Carta Aprobación</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_5_promesa', 'approvedCreditDocumentUrl', 'reserva')} />
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Acción Manual de Envío */}
            {client.stages?.promesaSolicitud?.cotizacionInmobiliariaUrl && client.stages?.promesaSolicitud?.approvedCreditDocumentUrl && (
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => savePromesaSolicitud(
                    clientRut, 
                    { 
                      cotizacionInmobiliariaUrl: client.stages?.promesaSolicitud?.cotizacionInmobiliariaUrl || '', 
                      approvedCreditDocumentUrl: client.stages?.promesaSolicitud?.approvedCreditDocumentUrl || '' 
                    }, 
                    'SYSTEM_USER'
                  )}
                  className="btn-primary"
                >
                  Confirmar Envío Inmobiliaria & Avanzar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- ETAPA 6: FIRMA DE PROMESA ----------------- */}
      {currentStage === 'promesa_firma' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Etapa 6: Firma de Promesa de Compraventa</h3>
            <p className="card-subtitle">Adjunta la Promesa firmada notarialmente o digitalmente por el cliente.</p>
          </div>

          <div className="mt-4 flex flex-col gap-5 items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            {client.stages?.promesaFirma?.promesaFirmadaUrl ? (
              <div className="flex flex-col items-center text-center">
                <FileCheck className="w-14 h-14 text-emerald-500 mb-2" />
                <h4 className="font-bold text-slate-800 text-base">Promesa de Compraventa Firmada</h4>
                <p className="text-xs text-slate-400 mt-1">El archivo fue guardado con éxito.</p>
                <div className="flex gap-3 mt-4">
                  <a href={client.stages.promesaFirma.promesaFirmadaUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">Visualizar Promesa</a>
                  <button onClick={() => savePromesaFirma(clientRut, client.stages?.promesaFirma?.promesaFirmadaUrl || '', 'SYSTEM_USER')} className="btn-primary text-xs">Confirmar y Continuar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-slate-400 mb-2" />
                <h4 className="font-semibold text-slate-700 text-sm">Cargar Promesa Firmada</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[250px] text-center">Selecciona la copia digitalizada de la promesa firmada en formato PDF.</p>
                <label className="file-uploader-mini mt-4">
                  {uploadingField === 'promesaFirmadaUrl' ? (
                    <span className="text-xs text-slate-500 flex items-center gap-1.5"><span className="loader-mini" /> {progress}%</span>
                  ) : (
                    <>
                      Seleccionar Archivo
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_6_promesa', 'promesaFirmadaUrl', 'reserva')} />
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- ETAPA 7: GESTIÓN DE CRÉDITO ----------------- */}
      {currentStage === 'contacto' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Etapa 7: Contacto Banco e Inmobiliaria (Gestión de Crédito)</h3>
            <p className="card-subtitle">
              Esta etapa sirve para registrar el contacto entre el ejecutivo bancario asignado y la inmobiliaria.
              Utiliza la <strong>Bitácora de Hitos</strong> abajo para ingresar actualizaciones y observaciones del seguimiento del crédito.
            </p>
          </div>

          <div className="p-5 border border-blue-100 rounded-2xl bg-blue-50/50 flex flex-col gap-3 mt-4">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
              <Landmark className="w-4 h-4" />
              Gestión Comercial Activa
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              El crédito está siendo tramitado bajo la aprobación de <strong>{client.approvalResolution?.approvedEntityId.toUpperCase()}</strong>.
              Asegúrate de consultar el estado de la tasación, estudio de títulos y redacción de escritura con el ejecutivo asignado, registrando cada hito en la bitácora de abajo.
            </p>
            <div className="flex justify-end border-t border-blue-200/50 pt-3 mt-1">
              <button onClick={() => updateClientState(clientRut, 'escritura')} className="btn-primary text-xs flex items-center gap-1">
                Completar Gestión e Ir a Escrituración <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ETAPA 8: FIRMA DE ESCRITURA ----------------- */}
      {currentStage === 'escritura' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Etapa 8: Firma de Escritura</h3>
            <p className="card-subtitle">Registro de firmas en notaría. Se puede adjuntar opcionalmente la copia de la escritura.</p>
          </div>

          <div className="mt-4 flex flex-col gap-5">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex gap-3">
                <Stamp className="w-10 h-10 text-blue-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Escrituración Notarial</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Sube la escritura firmada si está disponible, o avanza directamente si ya fue firmada.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <label className="file-uploader-mini flex-1 md:flex-initial text-center justify-center">
                  {uploadingField === 'escrituraFirmadaUrl' ? (
                    <span className="text-xs text-slate-500 flex items-center gap-1.5"><span className="loader-mini" /> {progress}%</span>
                  ) : (
                    <>
                      {client.stages?.escritura?.escrituraFirmadaUrl ? 'Reemplazar Escritura' : 'Subir Escritura (Opc.)'}
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'etapa_8_escritura', 'escrituraFirmadaUrl', 'reserva')} />
                    </>
                  )}
                </label>
                
                <button 
                  onClick={() => saveEscrituraFirma(clientRut, client.stages?.escritura?.escrituraFirmadaUrl || '', 'SYSTEM_USER')}
                  className="btn-primary flex-1 md:flex-initial"
                >
                  Marcar Firmada & Continuar
                </button>
              </div>
            </div>

            {client.stages?.escritura?.escrituraFirmadaUrl && (
              <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Escritura cargada: <a href={client.stages.escritura.escrituraFirmadaUrl} target="_blank" rel="noreferrer" className="underline font-bold">Ver PDF</a></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- ETAPA 9: CONSERVADOR BIENES RAÍCES (CBR) ----------------- */}
      {currentStage === 'cbr' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Etapa 9: Conservador de Bienes Raíces (CBR)</h3>
            <p className="card-subtitle">Ingreso y revisión en el Conservador. Ingresa el número de carátula o estado para coordinar la entrega.</p>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500">Estado de Inscripción Notarial (CBR)</label>
              <input
                type="text"
                placeholder="Ej. Carátula N° 123456 - En proceso de inscripción / Reingreso programado"
                value={cbrText}
                onChange={(e) => setCbrText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-700 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            
            <div className="flex justify-end mt-2">
              <button 
                onClick={() => saveCbrStatus(clientRut, cbrText.trim() || 'En trámite de inscripción')}
                className="btn-primary"
              >
                Registrar Inscripción & Programar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ETAPA 10: ENTREGA ----------------- */}
      {currentStage === 'entrega' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Etapa 10: Entrega Física del Departamento</h3>
            <p className="card-subtitle">Paso final. Registra las actas de entrega, observaciones de post-venta o firma final.</p>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {client.stages?.entrega?.deliveredAt ? (
              <div className="text-center p-8 bg-emerald-50 border border-emerald-100 rounded-3xl text-emerald-800">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                <h4 className="font-bold text-lg">Departamento Entregado Satisfactoriamente</h4>
                <p className="text-xs opacity-90 mt-1">El proceso inmobiliario se encuentra totalmente cerrado.</p>
                {client.stages.entrega.notes && (
                  <div className="mt-4 bg-white/70 border border-emerald-200/50 rounded-xl p-3.5 text-slate-700 text-xs font-medium max-w-md mx-auto">
                    <strong>Observaciones de Entrega:</strong> {client.stages.entrega.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-slate-500">Observaciones y Notas de Recepción</label>
                <textarea
                  rows={4}
                  placeholder="Detalles sobre entrega de llaves, firmas del acta de entrega, etc..."
                  value={entregaNotes}
                  onChange={(e) => setEntregaNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-700 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={() => completeEntregaStage(clientRut, entregaNotes, 'SYSTEM_USER')}
                    className="btn-success"
                  >
                    Marcar Entregado (Cerrar Pipeline)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
