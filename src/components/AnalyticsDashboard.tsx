import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { 
  BarChart3, Clock, AlertTriangle, CheckCircle2, 
  ArrowLeft, Calendar, AlertOctagon, TrendingUp
} from 'lucide-react';

interface StageClosure {
  stage: string;
  count: number;
  type: 'cancelado' | 'entregado';
}

interface StageDuration {
  stage: string;
  avgSeconds: number;
  count: number;
}

interface AnalyticsData {
  avgCompletionSeconds: number | null;
  stageClosures: StageClosure[];
  avgStageDurations: StageDuration[];
}

const STAGE_LABELS: Record<string, string> = {
  reserva: 'Reserva',
  documentacion: 'Recepción Doc.',
  banca: 'Ev. Bancaria',
  mutuaria: 'Ev. Mutuaria',
  promesa_solicitud: 'Sol. Promesa',
  promesa_firma: 'Firma Promesa',
  contacto: 'Gestión Crédito',
  escritura: 'Firma Escritura',
  cbr: 'CBR',
  entrega: 'Entregado',
  cancelado: 'Cancelado/Baja'
};

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || isNaN(seconds)) return 'Sin expedientes finalizados';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} días, ${hours} hrs`;
  }
  if (hours > 0) {
    return `${hours} hrs, ${minutes} min`;
  }
  return `${minutes} min`;
};

export const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/summary`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          throw new Error('Respuesta de API incorrecta');
        }
      } catch (err) {
        console.error('Error al cargar analíticas:', err);
        setError('No se pudo establecer conexión con el servicio de análisis de base de datos.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="loader" />
        <p className="text-slate-400 text-sm font-semibold animate-pulse">Procesando métricas en la base de datos relacional...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Error al Cargar Analíticas</h3>
        <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-sm mx-auto leading-relaxed">
          {error || 'No se pudieron calcular los indicadores en este momento.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </button>
      </div>
    );
  }

  // Encontrar el paso con mayor demora para mostrar como insight
  const maxDelayStage = data.avgStageDurations.length > 0 ? data.avgStageDurations[0] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Botón Volver */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-500" />
          Volver al Dashboard
        </button>
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Métricas de Rendimiento y Analíticas
        </h2>
      </div>

      {/* Grid de KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Promedio de Duración de Carpetas */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Duración Promedio (Creación → Entrega)</h4>
            <p className="text-lg font-extrabold text-slate-800 mt-1">
              {formatDuration(data.avgCompletionSeconds)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Calculado sobre carpetas completadas (Entregadas)</p>
          </div>
        </div>

        {/* KPI 2: Cuello de Botella Crítico */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Mayor Cuello de Botella</h4>
            <p className="text-lg font-extrabold text-slate-800 mt-1">
              {maxDelayStage ? STAGE_LABELS[maxDelayStage.stage] || maxDelayStage.stage : 'Ninguno'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {maxDelayStage ? `Demora prom: ${formatDuration(maxDelayStage.avgSeconds)}` : 'Sin datos de transiciones'}
            </p>
          </div>
        </div>

        {/* KPI 3: Tasa de Éxito / Entregas */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Entregas Finales</h4>
            <p className="text-lg font-extrabold text-slate-800 mt-1">
              {data.stageClosures.find(c => c.stage === 'entrega')?.count || 0} Carpeta(s)
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Casos exitosos en etapa de Entrega</p>
          </div>
        </div>
      </div>

      {/* Grid de Secciones de Gráficos y Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel 1: Tiempos de Demora por Etapa */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Tiempos de Demora Promedio por Etapa
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Promedio de tiempo transcurrido desde que se ingresa a la etapa hasta que se avanza.</p>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            {data.avgStageDurations.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center font-medium">No hay suficientes registros de avance de etapas para calcular demoras.</p>
            ) : (
              data.avgStageDurations.map((item, idx) => {
                // Calcular porcentaje respecto a la mayor demora para la barra visual
                const maxVal = data.avgStageDurations[0]?.avgSeconds || 1;
                const pct = (item.avgSeconds / maxVal) * 100;

                return (
                  <div key={item.stage} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 w-5 h-5 rounded-md flex items-center justify-center font-extrabold">{idx + 1}</span>
                        {STAGE_LABELS[item.stage] || item.stage}
                      </span>
                      <span className="font-extrabold text-slate-900">{formatDuration(item.avgSeconds)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-lg overflow-hidden border border-slate-200/20">
                      <div 
                        className={`h-full rounded-lg transition-all duration-500 ${
                          idx === 0 ? 'bg-gradient-to-r from-amber-500 to-rose-500' :
                          idx === 1 ? 'bg-amber-400' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold">
                      <span>Muestra: {item.count} transiciones</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 2: Cierres y Bajas por Etapa */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              Cierres de Carpeta y Bajas por Etapa
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Conteo de carpetas comerciales que fueron canceladas o entregadas en cada etapa del pipeline.</p>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-2xl mt-2">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Etapa</th>
                  <th className="py-3 px-4">Tipo de Cierre</th>
                  <th className="py-3 px-4 text-right">Cantidad de Carpetas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 font-medium">
                {data.stageClosures.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">
                      No hay registros de bajas o entregas en la base de datos.
                    </td>
                  </tr>
                ) : (
                  data.stageClosures.map((item) => (
                    <tr key={item.stage} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {STAGE_LABELS[item.stage] || item.stage}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${
                          item.type === 'entregado' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          {item.type === 'entregado' ? 'Entregada (Éxito)' : 'Baja (Cancelado)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {item.count} caso(s)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
