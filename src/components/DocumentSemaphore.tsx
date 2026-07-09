import React from 'react';
import { useClientPipeline } from '../context/ClientPipelineContext';
import { CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';

export const DocumentSemaphore: React.FC = () => {
  const { client } = useClientPipeline();

  if (!client || !client.stages?.documentacion) {
    return (
      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center gap-3 shadow-sm">
        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
        <span className="font-medium text-sm">ROJO: Sin documentación cargada en el expediente.</span>
      </div>
    );
  }

  const docStage = client.stages.documentacion;
  const payslipsCount = docStage.liquidacionesSueldo?.length || 0;
  const hasCmf = !!docStage.informeCmf;
  const hasAfp = !!docStage.cotizacionesAfp;
  const hasTitulo = !!docStage.certificadoTitulo;

  // Lógica de Semáforo
  let status: 'red' | 'yellow' | 'green' = 'red';
  let title = '';
  let description = '';

  if (payslipsCount === 0 && !hasCmf && !hasAfp) {
    status = 'red';
    title = 'ROJO: Expediente Documental Vacío';
    description = 'No se ha subido ningún documento obligatorio para iniciar la evaluación.';
  } else if (payslipsCount >= 6 && hasCmf && hasAfp) {
    status = 'green';
    title = 'VERDE: Expediente Completo';
    description = 'Toda la documentación obligatoria está cargada. Listo para avanzar a evaluación.';
  } else {
    status = 'yellow';
    title = 'AMARILLO: Expediente Incompleto';
    description = `Faltan documentos obligatorios. Cargado: ${payslipsCount}/6 Liquidaciones de sueldo, CMF: ${hasCmf ? 'Cargado' : 'Pendiente'}, AFP: ${hasAfp ? 'Cargado' : 'Pendiente'}.`;
  }

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${
      status === 'red' ? 'bg-rose-50/75 border-rose-200/60 text-rose-900' :
      status === 'yellow' ? 'bg-amber-50/75 border-amber-200/60 text-amber-900' :
      'bg-emerald-50/75 border-emerald-200/60 text-emerald-900'
    }`}>
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          {status === 'red' && <XCircle className="w-6 h-6 text-rose-600 animate-pulse" />}
          {status === 'yellow' && <AlertTriangle className="w-6 h-6 text-amber-600 animate-pulse" />}
          {status === 'green' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
        </div>
        <div>
          <h4 className="font-bold text-base leading-tight">{title}</h4>
          <p className="text-xs sm:text-sm opacity-90 mt-1">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
          payslipsCount >= 6 ? 'bg-emerald-100/60 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <FileText className="w-3.5 h-3.5" />
          Liquidaciones ({payslipsCount}/6)
        </span>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
          hasCmf ? 'bg-emerald-100/60 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <FileText className="w-3.5 h-3.5" />
          Informe CMF
        </span>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
          hasAfp ? 'bg-emerald-100/60 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <FileText className="w-3.5 h-3.5" />
          Cotizaciones AFP
        </span>
        {hasTitulo && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border bg-blue-100/60 border-blue-200 text-blue-800">
            <FileText className="w-3.5 h-3.5" />
            Cert. Título (Opcional)
          </span>
        )}
      </div>
    </div>
  );
};
