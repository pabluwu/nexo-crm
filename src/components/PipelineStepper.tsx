import React from 'react';
import { useClientPipeline } from '../context/ClientPipelineContext';

import { updateClientState } from '../services/db';
import type { PipelineState } from '../types';
import { Check, ArrowRight, XCircle } from 'lucide-react';

const STAGES: { key: PipelineState; label: string; desc: string }[] = [
  { key: 'reserva', label: 'Reserva', desc: 'Ficha y abono inicial' },
  { key: 'documentacion', label: 'Recepción Doc.', desc: 'Recepción de acreditación' },
  { key: 'banca', label: 'Ev. Bancaria', desc: 'Pre-aprobación multi-banco' },
  { key: 'mutuaria', label: 'Ev. Mutuaria', desc: 'Pre-aprobación mutuarias' },
  { key: 'promesa_solicitud', label: 'Solicitud Promesa', desc: 'Envío de documentos a inmobiliaria' },
  { key: 'promesa_firma', label: 'Firma Promesa', desc: 'Firma de promesa de compraventa' },
  { key: 'contacto', label: 'Gestión Crédito', desc: 'Coordinación banco e inmobiliaria' },
  { key: 'escritura', label: 'Escrituración', desc: 'Firma de escritura' },
  { key: 'cbr', label: 'CBR', desc: 'Inscripción en el Conservador' },
  { key: 'entrega', label: 'Entrega', desc: 'Entrega física de llaves' }
];

export const PipelineStepper: React.FC = () => {
  const { client, clientRut, bankEvaluations, mutuariaEvaluations, viewedStage, setViewedStage, stagesHistory } = useClientPipeline();

  if (!client) return null;

  const currentIdx = STAGES.findIndex((s) => s.key === client.pipelineState);

  // Validar si el cliente puede avanzar de etapa según reglas de negocio
  const canAdvance = (): { allowed: boolean; reason?: string } => {
    if (client.pipelineState === 'documentacion') {
      // Desactivado de forma temporal para pruebas en local sin Firebase Storage real
      return { allowed: true };
    }

    if (client.pipelineState === 'banca') {
      const hasBankApproval = bankEvaluations.some((b) => b.status === 'approved');
      const allBanksRejected = bankEvaluations.length > 0 && bankEvaluations.every((b) => b.status === 'rejected');
      
      if (hasBankApproval) {
        return { allowed: true };
      }
      if (allBanksRejected) {
        return { allowed: true }; // Permitido avanzar para bifurcar a Mutuaria
      }
      return {
        allowed: false,
        reason: 'Se requiere la aprobación de al menos un banco o que todos sean rechazados para pasar a Mutuaria.'
      };
    }

    if (client.pipelineState === 'mutuaria') {
      const hasMutuariaApproval = mutuariaEvaluations.some((m) => m.status === 'approved');
      const allMutuariasRejected = mutuariaEvaluations.length > 0 && mutuariaEvaluations.every((m) => m.status === 'rejected');
      
      if (hasMutuariaApproval || allMutuariasRejected) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Se requiere la aprobación de al menos una mutuaria o que todas sean rechazadas para dar de baja la reserva.'
      };
    }

    return { allowed: true };
  };

  const handleNextStep = async () => {
    const check = canAdvance();
    if (!check.allowed) return;

    let nextStage: PipelineState = 'entrega';

    // Bifurcación en Banca
    if (client.pipelineState === 'banca') {
      const hasBankApproval = bankEvaluations.some((b) => b.status === 'approved');
      if (hasBankApproval) {
        nextStage = 'promesa_solicitud'; // Salta a Solicitud de Promesa
      } else {
        nextStage = 'mutuaria'; // Pasa a Evaluación Mutuarias
      }
    } 
    // Bifurcación en Mutuaria
    else if (client.pipelineState === 'mutuaria') {
      const hasMutuariaApproval = mutuariaEvaluations.some((m) => m.status === 'approved');
      if (hasMutuariaApproval) {
        nextStage = 'promesa_solicitud'; // Salta a Solicitud de Promesa
      } else {
        nextStage = 'cancelado'; // Da de baja la reserva
      }
    } 
    // Flujo normal secuencial
    else {
      const nextItem = STAGES[currentIdx + 1];
      if (nextItem) {
        nextStage = nextItem.key;
      }
    }

    try {
      await updateClientState(clientRut, nextStage);
    } catch (err) {
      console.error('Error al avanzar etapa:', err);
    }
  };

  const checkStatus = canAdvance();

  return (
    <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100/80 flex flex-col gap-6">
      {/* Listado de Etapas (Stepper visual) */}
      <div className="relative flex justify-between items-center w-full overflow-x-auto pb-4 pt-2 px-4 scrollbar-thin">
        {/* Línea de fondo del Stepper */}
        <div className="absolute top-[28px] left-[40px] right-[40px] h-[3px] bg-slate-100 -z-10 hidden md:block" />

        {STAGES.map((stage, idx) => {
          const isCompleted = idx < STAGES.findIndex(s => s.key === client.pipelineState);
          const isActualActive = stage.key === client.pipelineState;
          const isSelected = stage.key === viewedStage;
          const isClickable = idx <= STAGES.findIndex(s => s.key === client.pipelineState);

          // Buscar el historial de esta etapa
          const historyRecord = stagesHistory ? stagesHistory.find((s: any) => s.stage === stage.key) : null;
          
          // Calcular la duración en texto para la etapa
          let durationText: string | null = null;
          if (historyRecord && historyRecord.enteredAt) {
            const start = historyRecord.enteredAt.seconds;
            const end = historyRecord.exitedAt ? historyRecord.exitedAt.seconds : Math.floor(Date.now() / 1000);
            const durationSecs = end - start;
            
            if (durationSecs >= 0) {
              const days = Math.floor(durationSecs / 86400);
              const hours = Math.floor((durationSecs % 86400) / 3600);
              const minutes = Math.floor((durationSecs % 3600) / 60);
              const seconds = durationSecs % 60;

              if (days > 0) {
                durationText = `${days}d ${hours}h`;
              } else if (hours > 0) {
                durationText = `${hours}h ${minutes}m`;
              } else if (minutes > 0) {
                durationText = `${minutes}m`;
              } else {
                durationText = `${seconds}s`;
              }
            }
          }

          return (
            <div 
              key={stage.key} 
              onClick={() => isClickable && setViewedStage(stage.key)}
              className={`flex flex-col items-center min-w-[120px] relative text-center ${isClickable ? 'cursor-pointer hover:opacity-85 transition-opacity' : 'opacity-50 cursor-not-allowed'}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isSelected
                    ? 'bg-blue-600 border-2 border-blue-600 text-white ring-4 ring-blue-100 shadow-lg scale-105'
                    : isCompleted
                    ? 'bg-emerald-500 border-2 border-emerald-500 text-white shadow-emerald-100 shadow-md'
                    : isActualActive
                    ? 'bg-white border-2 border-blue-500 text-blue-600 shadow-sm'
                    : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}
              >
                {isCompleted && !isSelected ? <Check className="w-5 h-5" /> : idx + 1}
              </div>

              {/* Leyenda del tiempo transcurrido / de demora */}
              {durationText && historyRecord && (
                <div className={`mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none tracking-tight shrink-0 select-none ${
                  historyRecord.exitedAt
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-blue-50 border-blue-100 text-blue-600 animate-pulse'
                }`}>
                  {historyRecord.exitedAt ? `Duró: ${durationText}` : `Lleva: ${durationText}`}
                </div>
              )}

              <div className="mt-2.5">
                <p
                  className={`text-xs font-semibold tracking-wide ${
                    isSelected ? 'text-blue-700 font-bold underline decoration-2 underline-offset-4' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {stage.label}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5 max-w-[100px] mx-auto hidden sm:block">
                  {stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de alerta/descripción y botón de avance */}
      {client.pipelineState !== 'entrega' && client.pipelineState !== 'cancelado' ? (
        <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!checkStatus.allowed && (
              <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 px-3.5 py-2 rounded-xl border border-rose-100">
                <XCircle className="w-4.5 h-4.5 shrink-0" />
                <span className="font-medium">{checkStatus.reason}</span>
              </div>
            )}
            {checkStatus.allowed && (
              <div className="text-slate-500 text-sm font-medium">
                Etapa actual: <span className="font-bold text-slate-800">{STAGES[currentIdx]?.label}</span>. Todo listo para avanzar.
              </div>
            )}
          </div>

          <button
            onClick={handleNextStep}
            disabled={!checkStatus.allowed}
            className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 ${
              checkStatus.allowed
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            Avanzar Etapa
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className={`p-4 rounded-xl text-center border text-sm font-bold ${
          client.pipelineState === 'entrega'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {client.pipelineState === 'entrega'
            ? '🎉 ¡Proceso de Compra Finalizado Exitosamente! Departamento Entregado.'
            : '❌ Proceso Cancelado: Reserva Dada de Baja.'}
        </div>
      )}
    </div>
  );
};
