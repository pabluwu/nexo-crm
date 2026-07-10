import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import { ClientPipelineProvider, useClientPipeline } from './context/ClientPipelineContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { DashboardGeneral } from './components/DashboardGeneral';
import { PipelineStepper } from './components/PipelineStepper';
import { StageRenderer } from './components/StageRenderer';
import { MilestoneBitacora } from './components/MilestoneBitacora';
import { CancelFolderModal } from './components/CancelFolderModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { GlobalFolderView } from './components/GlobalFolderView';
import { Building2, User, Mail, Phone, MapPin, ArrowLeft, AlertCircle, Clock, Calendar, BarChart3, LogOut, ChevronDown } from 'lucide-react';



const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d y ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h y ${minutes}m`;
  }
  return `${minutes}m`;
};

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

const ClientDetailsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { client, loading, stagesHistory } = useClientPipeline();
  const { user } = useAuth();

  const processTimes = React.useMemo(() => {
    if (!stagesHistory || stagesHistory.length === 0 || !client) return null;

    const reservaStage = stagesHistory.find((s: any) => s.stage === 'reserva');
    if (!reservaStage) return null;

    const startSecs = reservaStage.enteredAt?.seconds || 0;
    if (!startSecs) return null;

    const activeStage = client.pipelineState;
    const isCompleted = activeStage === 'entrega' || activeStage === 'cancelado';
    
    const lastStage = stagesHistory[stagesHistory.length - 1];
    const endSecs = isCompleted 
      ? (lastStage.enteredAt?.seconds || Math.floor(Date.now() / 1000))
      : Math.floor(Date.now() / 1000);

    const totalDurationSecs = endSecs - startSecs;

    // Buscar el registro de etapa activa (sin fecha de salida)
    const currentStageRecord = stagesHistory.find((s: any) => s.stage === activeStage && !s.exitedAt);
    const currentStageDuration = currentStageRecord 
      ? Math.floor(Date.now() / 1000) - (currentStageRecord.enteredAt?.seconds || 0)
      : 0;

    return {
      totalDuration: formatDuration(totalDurationSecs),
      currentStageDuration: currentStageDuration > 0 ? formatDuration(currentStageDuration) : null
    };
  }, [stagesHistory, client]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="loader" />
        <p className="text-slate-400 text-sm font-semibold animate-pulse">Sincronizando expediente en tiempo real...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Error al Cargar Expediente</h3>
        <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-sm mx-auto leading-relaxed">
          No se pudo encontrar la información asociada a este cliente o el documento ya no existe.
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

  const isCanceled = client.pipelineState === 'cancelado';

  return (
    <div className="flex flex-col gap-6">
      {/* Botones de Control Superior */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-500" />
          Volver al Dashboard
        </button>

        {user?.role === 'Administrador' && <CancelFolderModal />}
      </div>

      {/* Cabecera del Cliente */}
      <div 
        className="text-white rounded-3xl p-6 shadow-md border border-slate-700/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6" 
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/25 border border-blue-500/35 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {client.personalData.firstName} {client.personalData.lastName}
              </h2>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg">
                RUT: {client.personalData.rut}
              </span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg">
                Etapa: {STAGE_LABELS[client.pipelineState] || client.pipelineState}
              </span>
              {isCanceled && (
                <span className="bg-rose-500/25 text-rose-300 border border-rose-500/35 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg animate-pulse">
                  Baja Comercial
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {client.personalData.address}
            </p>
          </div>
        </div>

        {/* Métricas de Tiempos del Proceso */}
        {processTimes && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-4 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-amber-400 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Duración Total</p>
                <p className="text-xs text-slate-300 font-semibold">{processTimes.totalDuration}</p>
              </div>
            </div>
            {processTimes.currentStageDuration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-sky-400 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tiempo en Etapa</p>
                  <p className="text-xs text-slate-300 font-semibold">{processTimes.currentStageDuration}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Datos de Contacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-4 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email</p>
              <p className="text-xs text-slate-300 font-semibold">{client.personalData.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Teléfono</p>
              <p className="text-xs text-slate-300 font-semibold">{client.personalData.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Broker Creador</p>
              <p className="text-xs text-slate-300 font-semibold">{client.createdBy || 'Sistema'}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Alerta de Cierre si está cancelado */}
      {isCanceled && client.cancelation && (
        <div className="bg-rose-50 border border-rose-200/50 text-rose-900 rounded-2xl p-5 flex flex-col gap-2">
          <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 text-rose-800">
            <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
            Carpeta Comercial Cerrada
          </h4>
          <p className="text-xs sm:text-sm font-semibold opacity-90 leading-relaxed">
            Este expediente fue dado de baja de forma manual por el ejecutivo <strong>{client.cancelation.canceledBy}</strong> en la etapa <strong>{client.cancelation.stageAtCancelation.replace('_', ' ').toUpperCase()}</strong>.
          </p>
          <div className="mt-2 bg-white/60 border border-rose-200/40 p-3.5 rounded-xl text-xs font-semibold text-rose-950">
            <strong>Motivo del Cierre:</strong> {client.cancelation.reason}
          </div>
        </div>
      )}

      {/* Vista Operativa de Administración vs. Carpeta de Documentos de Broker */}
      {user?.role === 'Administrador' ? (
        <>
          <PipelineStepper />
          <StageRenderer />
        </>
      ) : (
        <GlobalFolderView />
      )}

      {/* Bitácora de Hitos */}
      <MilestoneBitacora />
    </div>
  );
};

// Wrapper para inyectar el parámetro RUT de la ruta de React Router al Context
const ClientDetailsPageWrapper: React.FC = () => {
  const { rut } = useParams<{ rut: string }>();
  const { setSelectedRut } = useClientPipeline();

  React.useEffect(() => {
    setSelectedRut(rut || null);
    return () => setSelectedRut(null);
  }, [rut, setSelectedRut]);

  return <ClientDetailsDashboard />;
};

const MainAppContent: React.FC = () => {
  const { loading: dbLoading, selectedRut } = useClientPipeline();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="loader" />
        <p className="text-slate-400 text-sm font-semibold">Verificando credenciales...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (dbLoading && selectedRut === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="loader" />
        <p className="text-slate-400 text-sm font-semibold">Cargando base de datos...</p>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6">
      <Routes>
        <Route path="/" element={<DashboardGeneral />} />
        <Route path="/client/:rut" element={<ClientDetailsPageWrapper />} />
        <Route 
          path="/analytics" 
          element={
            user.role === 'Administrador' ? (
              <AnalyticsDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
};

function AppContent() {
  const { user, logout, switchRole } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  return (
    <div className="min-h-screen pb-16">
      {user && (
        <header className="bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100/90 py-4 px-6 mb-6">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="bg-blue-600 p-2 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-100">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight tracking-tight flex items-center gap-1.5">
                  NexoProp
                  <span className="bg-blue-50 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-blue-100 tracking-wider">CRM</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Pipeline de Compras Inmobiliarias</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              {/* Reportes y analíticas sólo visible para Administrador */}
              {user.role === 'Administrador' && (
                <Link 
                  to="/analytics" 
                  title="Reportes y Analíticas"
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline">Reportes y Analíticas</span>
                </Link>
              )}

              {/* Menú de Perfil & Selector de Roles */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-bold transition-all cursor-pointer"
                >
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="w-5 h-5 rounded-full object-cover border border-slate-200"
                  />
                  <span className="max-w-[100px] truncate hidden sm:inline">{user.name}</span>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border ${
                    user.role === 'Administrador' 
                      ? 'bg-purple-50 text-purple-700 border-purple-100' 
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {user.role}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Simulador de Roles (Demo)</p>
                      <button
                        onClick={() => {
                          switchRole(user.role === 'Broker' ? 'Administrador' : 'Broker');
                          setShowProfileMenu(false);
                        }}
                        className="w-full mt-2 text-center bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold py-1.5 px-2 rounded-lg border border-blue-100 transition-colors cursor-pointer"
                      >
                        Cambiar a {user.role === 'Broker' ? 'Administrador' : 'Broker'}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 text-xs font-bold text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Contenido Dinámico con Rutas */}
      <MainAppContent />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClientPipelineProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
        </ClientPipelineProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}


export default App;
