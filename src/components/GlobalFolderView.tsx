import React, { useState } from 'react';
import { useClientPipeline } from '../context/ClientPipelineContext';
import { uploadClientFile } from '../services/storage';
import { 
  FolderOpen, FileText, Upload, CheckCircle2, 
  FileCheck, HardDrive 
} from 'lucide-react';

interface DocumentRowProps {
  label: string;
  description: string;
  url: string | undefined;
  stageFolder: string;
  fieldName: string;
  clientRut: string;
  onUploadStart: (fieldName: string) => void;
  onUploadEnd: () => void;
  uploadingField: string | null;
  progress: number;
}

const DocumentRow: React.FC<DocumentRowProps> = ({
  label,
  description,
  url,
  stageFolder,
  fieldName,
  clientRut,
  onUploadStart,
  onUploadEnd,
  uploadingField,
  progress
}) => {
  const isUploading = uploadingField === fieldName;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    onUploadStart(fieldName);
    try {
      await uploadClientFile(clientRut, stageFolder, fieldName, file);
    } catch (err) {
      console.error('Error al subir archivo:', err);
      alert('No se pudo subir el archivo. Inténtalo de nuevo.');
    } finally {
      onUploadEnd();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${url ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
          {url ? <FileCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800 leading-snug">{label}</h4>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-normal max-w-sm">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-center">
        {url ? (
          <div className="flex items-center gap-3">
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5"
            >
              Visualizar
            </a>
            
            <label className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center">
              {isUploading ? (
                <span className="flex items-center gap-1"><span className="loader-mini" /> {Math.round(progress)}%</span>
              ) : (
                <>
                  Reemplazar
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                </>
              )}
            </label>
          </div>
        ) : (
          <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer inline-flex items-center gap-1.5">
            {isUploading ? (
              <span className="flex items-center gap-1"><span className="loader-mini" /> {Math.round(progress)}%</span>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Subir
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
};

export const GlobalFolderView: React.FC = () => {
  const { client, clientRut } = useClientPipeline();
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  if (!client) return null;

  const handleUploadStart = (fieldName: string) => {
    setUploadingField(fieldName);
    setProgress(0);
  };

  const handleUploadEnd = () => {
    setUploadingField(null);
    setProgress(0);
  };

  const handleLiquidationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    handleUploadStart('liquidacion');
    try {
      await uploadClientFile(clientRut, 'etapa_2_documentacion/liquidaciones', 'liquidacion', file, (p) => {
        setProgress(p);
      });
    } catch (err) {
      console.error(err);
      alert('Error al cargar liquidación.');
    } finally {
      handleUploadEnd();
    }
  };

  const liquidaciones = client.stages?.documentacion?.liquidacionesSueldo || [];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Encabezado de la Carpeta */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FolderOpen className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Expediente Documental Centralizado</h3>
            <p className="text-[10px] text-slate-400 font-medium">Sube y organiza todos los archivos requeridos para el pipeline comercial del cliente.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/50 rounded-xl px-3 py-1.5 text-[10px] text-slate-500 font-bold shrink-0">
          <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sincronización con Google Drive Activa</span>
        </div>
      </div>

      {/* Grid de Secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sección 1: Documentación Inicial */}
        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-extrabold flex items-center justify-center">1</span>
            Reserva & Acreditación Básica
          </h3>
          
          <div className="flex flex-col gap-3">
            <DocumentRow
              label="Ficha de Reserva del Cliente"
              description="Documento PDF que detalla la reserva inicial de la propiedad."
              url={client.stages?.reserva?.fichaClienteUrl}
              stageFolder="etapa_1_reserva"
              fieldName="fichaClienteUrl"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />

            <DocumentRow
              label="Foto Cédula de Identidad"
              description="Copia legible del carnet de identidad por ambos lados."
              url={client.stages?.reserva?.fotoCarnetUrl}
              stageFolder="etapa_1_reserva"
              fieldName="fotoCarnetUrl"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />

            <DocumentRow
              label="Comprobante de Pago Reserva"
              description="Recibo o comprobante de transferencia bancaria de la reserva."
              url={client.stages?.reserva?.comprobanteReservaUrl}
              stageFolder="etapa_1_reserva"
              fieldName="comprobanteReservaUrl"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />
          </div>
        </div>

        {/* Sección 2: Acreditación Financiera */}
        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-extrabold flex items-center justify-center">2</span>
            Acreditación de Ingresos
          </h3>

          <div className="flex flex-col gap-3">
            <DocumentRow
              label="Informe CMF (Deuda)"
              description="Informe de deudas financieras de la CMF actualizado."
              url={client.stages?.documentacion?.informeCmf?.url}
              stageFolder="etapa_2_documentacion"
              fieldName="informeCmf"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />

            <DocumentRow
              label="Cotizaciones AFP"
              description="Certificado de cotizaciones de AFP (últimos 12 meses)."
              url={client.stages?.documentacion?.cotizacionesAfp?.url}
              stageFolder="etapa_2_documentacion"
              fieldName="cotizacionesAfp"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />

            <DocumentRow
              label="Certificado de Título"
              description="Copia legal del título profesional o técnico."
              url={client.stages?.documentacion?.certificadoTitulo?.url}
              stageFolder="etapa_2_documentacion"
              fieldName="certificadoTitulo"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />

            {/* Liquidaciones de Sueldo (Múltiple) */}
            <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Liquidaciones de Sueldo ({liquidaciones.length}/6)</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] leading-tight">Se requieren 6 liquidaciones mensuales consecutivas.</p>
                </div>

                {liquidaciones.length < 6 ? (
                  <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer inline-flex items-center gap-1.5">
                    {uploadingField === 'liquidacion' ? (
                      <span className="flex items-center gap-1"><span className="loader-mini" /> {Math.round(progress)}%</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Subir
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleLiquidationUpload} disabled={uploadingField === 'liquidacion'} />
                      </>
                    )}
                  </label>
                ) : (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completo</span>
                )}
              </div>

              {liquidaciones.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                  {liquidaciones.map((liq, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white border border-slate-100 rounded-xl p-2 text-[10px] shadow-sm">
                      <span className="truncate max-w-[100px] font-semibold text-slate-600">{liq.fileName}</span>
                      <a href={liq.url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:text-blue-800">Ver Archivo</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección 3: Promesas y Créditos */}
        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-extrabold flex items-center justify-center">3</span>
            Promesas & Evaluaciones
          </h3>

          <div className="flex flex-col gap-3">
            <DocumentRow
              label="Cotización Inmobiliaria"
              description="Detalle de cotización de la propiedad en promesa."
              url={client.stages?.promesaSolicitud?.cotizacionInmobiliariaUrl}
              stageFolder="etapa_5_promesa"
              fieldName="cotizacionInmobiliariaUrl"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />

            <DocumentRow
              label="Carta de Crédito Aprobado"
              description="Certificado emitido por el banco o mutuaria aprobando el crédito."
              url={client.stages?.promesaSolicitud?.approvedCreditDocumentUrl}
              stageFolder="etapa_5_promesa"
              fieldName="approvedCreditDocumentUrl"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />

            <DocumentRow
              label="Promesa de Compraventa Firmada"
              description="Copia en PDF de la promesa firmada por ambas partes."
              url={client.stages?.promesaFirma?.promesaFirmadaUrl}
              stageFolder="etapa_6_promesa"
              fieldName="promesaFirmadaUrl"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />
          </div>
        </div>

        {/* Sección 4: Cierre del Negocio */}
        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-extrabold flex items-center justify-center">4</span>
            Escrituración & Cierre
          </h3>

          <div className="flex flex-col gap-3">
            <DocumentRow
              label="Escritura Firmada"
              description="Documento PDF de la escritura de compraventa firmada en notaría."
              url={client.stages?.escritura?.escrituraFirmadaUrl}
              stageFolder="etapa_8_escritura"
              fieldName="escrituraFirmadaUrl"
              clientRut={clientRut}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
              uploadingField={uploadingField}
              progress={progress}
            />
          </div>
        </div>

      </div>

    </div>
  );
};
