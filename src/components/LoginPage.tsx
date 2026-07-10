import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldAlert, LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, googleClientId } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRealAuthAvailable, setIsRealAuthAvailable] = useState(false);

  // Cuentas de prueba pre-definidas para el modo simulado (Mock)
  const seedUsers = [
    {
      email: 'admin@nexoprop.com',
      name: 'Administrador NexoProp',
      role: 'Administrador',
      picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',
      desc: 'Acceso total y reportes analíticos'
    },
    {
      email: 'broker@nexoprop.com',
      name: 'Juan Broker',
      role: 'Broker',
      picture: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop',
      desc: 'Vista de sus propias carpetas comerciales'
    },
    {
      email: 'broker2@nexoprop.com',
      name: 'María Broker',
      role: 'Broker',
      picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
      desc: 'Vista de sus propias carpetas comerciales'
    }
  ];

  useEffect(() => {
    // 1. Verificar si hay un Client ID válido configurado
    if (googleClientId && googleClientId !== 'your-google-client-id.apps.googleusercontent.com') {
      setIsRealAuthAvailable(true);
    }

    // 2. Leer parámetros de sesión o error del callback de redirección
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    const errorParam = params.get('error');

    if (session) {
      try {
        const decodedUser = JSON.parse(atob(session));
        localStorage.setItem('nexoprop_user', JSON.stringify(decodedUser));
        window.dispatchEvent(new Event('db-update'));
        // Limpiar parámetros de la URL redireccionando a la raíz
        window.location.href = '/';
      } catch {
        setError('Error al decodificar la sesión de Google');
      }
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [googleClientId]);

  // Manejar el inicio de sesión real con Google (Redirect Flow)
  const handleGoogleLoginReal = () => {
    setError(null);
    setLoading(true);

    const redirectUri = 'http://localhost:3000/auth/google/callback';
    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive'
    ];
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${googleClientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  };


  // Manejar inicio de sesión rápido simulado (Mock)
  const handleMockLogin = async (userSeed: typeof seedUsers[0]) => {
    setError(null);
    setLoading(true);
    try {
      await login({
        isMock: true,
        email: userSeed.email,
        name: userSeed.name,
        picture: userSeed.picture
      });
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión simulada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Card Login */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center">
        
        {/* Logo App */}
        <div className="bg-blue-600 p-3 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-4 animate-bounce-slow">
          <Building2 className="w-8 h-8" />
        </div>
        
        <h2 className="text-xl font-extrabold text-white tracking-tight text-center">
          NexoProp CRM
        </h2>
        <p className="text-xs text-slate-400 mt-1 text-center font-medium">
          Acceso al Portal Inmobiliario
        </p>

        {/* Panel de Errores */}
        {error && (
          <div className="w-full mt-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="w-full mt-6 flex flex-col gap-4">
          
          {isRealAuthAvailable ? (
            <button
              onClick={handleGoogleLoginReal}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-md border border-slate-200 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.12 2.76-2.38 3.6v3h3.85c2.25-2.07 3.67-5.12 3.67-8.73z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.85-3c-1.08.72-2.45 1.16-4.11 1.16-3.17 0-5.85-2.14-6.81-5.02H1.24v3.1C3.21 21.24 7.27 24 12 24z" />
                <path fill="#FBBC05" d="M5.19 14.23c-.25-.72-.39-1.5-.39-2.23s.14-1.51.39-2.23V6.67H1.24C.45 8.24 0 10.02 0 12s.45 3.76 1.24 5.33l3.95-3.1z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.21 2.76 1.24 6.67l3.95 3.1c.96-2.88 3.64-5.02 6.81-5.02z" />
              </svg>
              <span>{loading ? 'Sincronizando...' : 'Iniciar Sesión con Google'}</span>
            </button>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-[10px] text-amber-300 font-semibold leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Modo Desarrollo Local Activo</p>
                <p className="opacity-80 mt-0.5">Google OAuth no configurado en .env. Selecciona una de las cuentas semilla de abajo para simular el login con su rol respectivo.</p>
              </div>
            </div>
          )}

          {/* Separador */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-[1px] bg-slate-800" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cuentas Semilla</span>
            <div className="flex-1 h-[1px] bg-slate-800" />
          </div>

          {/* Selector de Cuentas Mock */}
          <div className="flex flex-col gap-2.5 w-full">
            {seedUsers.map((u, idx) => (
              <button
                key={idx}
                onClick={() => handleMockLogin(u)}
                disabled={loading}
                className="w-full flex items-center justify-between text-left p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/70 hover:border-slate-700 transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={u.picture}
                    alt={u.name}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-700/60"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{u.name}</span>
                      <span className={`text-[8px] font-extrabold px-1 rounded uppercase ${
                        u.role === 'Administrador' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 group-hover:text-slate-400 mt-0.5 font-medium">{u.email}</p>
                  </div>
                </div>
                <LogIn className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-all shrink-0" />
              </button>
            ))}
          </div>

        </div>

        {/* Footer */}
        <p className="text-[9px] text-slate-600 mt-8 text-center font-medium uppercase tracking-wider">
          Protección de Datos & Google APIs Integradas
        </p>

      </div>
    </div>
  );
};
