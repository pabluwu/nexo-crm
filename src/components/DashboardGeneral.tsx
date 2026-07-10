import React, { useState } from 'react';
import { useClientPipeline } from '../context/ClientPipelineContext';
import { useNavigate } from 'react-router-dom';
import { CreateClientModal } from './CreateClientModal';
import { 
  CheckCircle2, AlertOctagon, Search, Filter, 
  FolderOpen, Plus, ClipboardList, Trash2, ArrowRight
} from 'lucide-react';

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

export const DashboardGeneral: React.FC = () => {
  const navigate = useNavigate();
  const { clientsList } = useClientPipeline();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // 1. Cálculos de Indicadores (KPIs)
  const totalClients = clientsList.length;
  const activeClients = clientsList.filter(
    (c) => c.pipelineState !== 'cancelado' && c.pipelineState !== 'entrega'
  ).length;
  const deliveredClients = clientsList.filter((c) => c.pipelineState === 'entrega').length;
  const canceledClients = clientsList.filter((c) => c.pipelineState === 'cancelado').length;

  // 2. Desglose de Cancelaciones por Etapa
  const cancellationsByStage: Record<string, number> = {};
  clientsList.forEach((c) => {
    if (c.pipelineState === 'cancelado' && c.cancelation) {
      const stage = c.cancelation.stageAtCancelation;
      cancellationsByStage[stage] = (cancellationsByStage[stage] || 0) + 1;
    }
  });

  // Lista de clientes cancelados para la tabla de historial de bajas
  const canceledList = clientsList.filter((c) => c.pipelineState === 'cancelado' && c.cancelation);

  // 3. Filtrado y Búsqueda de Clientes Activos/Todos
  const filteredClients = clientsList.filter((client) => {
    const nameMatch = `${client.personalData.firstName} ${client.personalData.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const rutMatch = client.personalData.rut.toLowerCase().includes(searchTerm.toLowerCase());
    const searchMatch = nameMatch || rutMatch;

    const filterMatch = stageFilter === 'all' || client.pipelineState === stageFilter;

    return searchMatch && filterMatch;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Portal de Operaciones Inmobiliarias</h2>
          <p className="text-xs text-slate-400">Panel general de control de carpetas comerciales y pipeline de compras.</p>
        </div>
        
        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4.5 h-4.5" />
          Apertura de Expediente
        </button>
      </div>

      {/* Tarjetas de Indicadores KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total */}
        <div className="card !p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Expedientes</p>
            <h3 className="text-2xl font-extrabold text-slate-800 leading-tight mt-0.5">{totalClients}</h3>
          </div>
        </div>

        {/* Activos */}
        <div className="card !p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Carpetas Activas</p>
            <h3 className="text-2xl font-extrabold text-slate-800 leading-tight mt-0.5">{activeClients}</h3>
          </div>
        </div>

        {/* Entregados */}
        <div className="card !p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Departamentos Entregados</p>
            <h3 className="text-2xl font-extrabold text-slate-800 leading-tight mt-0.5">{deliveredClients}</h3>
          </div>
        </div>

        {/* Cancelados */}
        <div className="card !p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bajas comerciales</p>
            <h3 className="text-2xl font-extrabold text-slate-800 leading-tight mt-0.5">{canceledClients}</h3>
          </div>
        </div>
      </div>

      {/* Desglose de Bajas / Cancelaciones (Si existen) */}
      {canceledClients > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Desglose de etapas */}
          <div className="card lg:col-span-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-4">
              <AlertOctagon className="w-4.5 h-4.5 text-rose-500" />
              Bajas por Etapa del Pipeline
            </h3>
            <div className="flex flex-col gap-3">
              {Object.entries(cancellationsByStage).map(([stage, count]) => (
                <div key={stage} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-semibold text-slate-600">
                  <span className="capitalize">{STAGE_LABELS[stage] || stage}</span>
                  <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold">{count} {count === 1 ? 'caso' : 'casos'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de bajas */}
          <div className="card lg:col-span-2 overflow-x-auto">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-4">
              <Trash2 className="w-4.5 h-4.5 text-rose-500" />
              Historial y Motivos de Carpetas Dadas de Baja
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2.5">Cliente</th>
                  <th className="py-2.5">Etapa de Baja</th>
                  <th className="py-2.5">Motivo del Cierre</th>
                  <th className="py-2.5">Ejecutivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {canceledList.map((client, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 font-semibold text-slate-700">
                      {client.personalData.firstName} {client.personalData.lastName}
                    </td>
                    <td className="py-3">
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold uppercase text-[9px]">
                        {STAGE_LABELS[client.cancelation!.stageAtCancelation] || client.cancelation!.stageAtCancelation}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 font-medium max-w-[200px] truncate" title={client.cancelation!.reason}>
                      {client.cancelation!.reason}
                    </td>
                    <td className="py-3 text-slate-400 font-semibold">
                      {client.cancelation!.canceledBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Listado Principal de Clientes */}
      <div className="card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="card-title">Directorio General de Expedientes</h3>
            <p className="card-subtitle">Busca y filtra entre todos los procesos de compra cargados en el sistema.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Buscador */}
            <div className="relative flex-1 md:flex-initial min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por Nombre o RUT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Filtro por Etapa */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-500">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-transparent border-0 font-semibold focus:outline-none text-slate-600 cursor-pointer"
              >
                <option value="all">Todas las Etapas</option>
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Clientes */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-semibold">
            No se encontraron expedientes que coincidan con la búsqueda o filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-2">Cliente</th>
                  <th className="py-3 px-2 hidden sm:table-cell">RUT</th>
                  <th className="py-3 px-2">Etapa del Proceso</th>
                  <th className="py-3 px-2 hidden md:table-cell">Última Actualización</th>
                  <th className="py-3 px-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 font-medium">
                {filteredClients.map((client) => {
                  const stage = client.pipelineState;
                  
                  return (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{client.personalData.firstName} {client.personalData.lastName}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{client.personalData.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 font-mono text-xs text-slate-500 hidden sm:table-cell">{client.personalData.rut}</td>
                      <td className="py-4 px-2">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                          stage === 'entrega' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                          stage === 'cancelado' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                          stage === 'reserva' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                          'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          {STAGE_LABELS[stage] || stage}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-xs text-slate-400 hidden md:table-cell">
                        {client.updatedAt ? new Date(client.updatedAt.seconds * 1000).toLocaleString() : 'Cargando...'}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button
                          onClick={() => navigate(`/client/${client.id}`)}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          Ver Expediente
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Creación */}
      {isCreateOpen && (
        <CreateClientModal onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  );
};
