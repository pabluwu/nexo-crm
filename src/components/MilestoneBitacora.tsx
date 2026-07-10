import React, { useState } from 'react';
import { useClientPipeline } from '../context/ClientPipelineContext';
import { useAuth } from '../context/AuthContext';
import { addMilestone } from '../services/db';
import { MessageSquare, Calendar, User, CornerDownRight, Plus, AlertCircle } from 'lucide-react';

export const MilestoneBitacora: React.FC = () => {
  const { client, clientRut, milestones } = useClientPipeline();
  const { user: authUser } = useAuth();
  const [observation, setObservation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!client) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observation.trim()) return;
    if (!authUser) return;

    setSubmitting(true);
    setError(null);

    try {
      // Registrar hito con datos reales del usuario autenticado
      await addMilestone(
        clientRut,
        observation.trim(),
        authUser.name,
        authUser.email,
        client.pipelineState
      );
      setObservation('');
    } catch (err: any) {
      console.error('Error al guardar hito:', err);
      setError('No se pudo guardar la observación. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/80 flex flex-col gap-6 mt-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Bitácora de Hitos e Interacciones
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Historial de consultas a externos, observaciones y gestiones comerciales del expediente.
        </p>
      </div>

      {/* Formulario de registro (Sólo Administrador) */}
      {authUser && authUser.role === 'Administrador' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative">
            <textarea
              rows={3}
              placeholder="Registrar nueva llamada con ejecutivo del banco, consulta externa, o nota del proceso..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200/80 text-sm text-slate-700 rounded-2xl p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 transition-all resize-none"
            />
            <button
              type="submit"
              disabled={!observation.trim() || submitting}
              className={`absolute bottom-4 right-4 p-2 rounded-xl transition-all shadow-sm ${
                observation.trim() && !submitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4.5 h-4.5" />
            </button>
          </div>
        </form>
      )}


      {/* Línea de tiempo / Listado */}
      {milestones.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-sm">
          No hay comentarios registrados en la bitácora aún.
        </div>
      ) : (
        <div className="relative border-l border-slate-100 ml-3 pl-6 flex flex-col gap-5 pt-2">
          {milestones.map((milestone, idx) => {
            const dateObj = milestone.date ? new Date(milestone.date.seconds * 1000) : new Date();

            return (
              <div key={idx} className="relative group">
                {/* Marcador en la línea */}
                <span className="absolute -left-[30px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />

                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:bg-slate-50 hover:border-slate-200/80 transition-all duration-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-2.5">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50/80 px-2.5 py-0.5 rounded-lg">
                      <CornerDownRight className="w-3.5 h-3.5" />
                      Etapa: {milestone.stage.replace('_', ' ')}
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-xs font-medium">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{milestone.registeredBy}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateObj.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                    {milestone.observation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
