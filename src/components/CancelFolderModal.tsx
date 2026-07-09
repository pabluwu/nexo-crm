import React, { useState } from 'react';
import { useClientPipeline } from '../context/ClientPipelineContext';
import { cancelClientFolder } from '../services/db';
import { X, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react';

export const CancelFolderModal: React.FC = () => {
  const { client, clientRut } = useClientPipeline();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!client) return null;

  // No mostrar el botón si el expediente ya está cancelado o entregado
  if (client.pipelineState === 'cancelado' || client.pipelineState === 'entrega') {
    return null;
  }

  const handleCancelFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Debes especificar un motivo para dar de baja la carpeta comercial.');
      return;
    }

    setSubmitting(true);

    try {
      // Registrar la baja en Firestore (offline-friendly, sin await)
      cancelClientFolder(
        clientRut,
        reason.trim(),
        client.pipelineState,
        'mock-executive-uid',
        'Ejecutivo Comercial'
      );
      
      setReason('');
      setIsOpen(false);
    } catch (err: any) {
      console.error('Error al dar de baja:', err);
      setError('Ocurrió un error al procesar el cierre. Inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Botón de Activación */}
      <button
        onClick={() => {
          setIsOpen(true);
          setReason('');
          setError(null);
        }}
        className="bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200/50 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
      >
        <Trash2 className="w-4 h-4 text-rose-500" />
        Dar de Baja Reserva
      </button>

      {/* Modal Diálogo */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Cabecera */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-slate-800 text-base">Dar de Baja Carpeta Comercial</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                disabled={submitting}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Formulario */}
            <form onSubmit={handleCancelFolder} className="p-6 flex flex-col gap-4">
              
              {/* Alerta de Peligro */}
              <div className="bg-amber-50 border border-amber-200/60 text-amber-900 p-4 rounded-2xl text-xs flex gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold mb-0.5">Acción Irreversible</h4>
                  <p className="opacity-90 leading-normal">
                    Dar de baja la reserva cerrará definitivamente el expediente de compraventa. Esta acción se registrará en la bitácora histórica.
                  </p>
                </div>
              </div>

              {error && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Input de motivo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Motivo de la Cancelación (Requerido)</label>
                <textarea
                  rows={3}
                  required
                  disabled={submitting}
                  placeholder="Ej. Evaluación bancaria rechazada en todos los bancos / Cliente desiste de la compra por motivos personales..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="btn-secondary text-xs"
                >
                  Conservar Carpeta
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                >
                  Dar de Baja
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
};
