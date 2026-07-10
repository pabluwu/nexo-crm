import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

interface User {
  email: string;
  name: string;
  picture: string;
  role: 'Broker' | 'Administrador';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (authData: { code?: string; isMock?: boolean; email?: string; name?: string; picture?: string }) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: 'Broker' | 'Administrador') => Promise<void>;
  googleClientId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Intentar cargar la sesión guardada al iniciar la app
  useEffect(() => {
    const savedUser = localStorage.getItem('nexoprop_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Error al restaurar sesión:', err);
      }
    }
    setLoading(false);
  }, []);

  const login = async (authData: { code?: string; isMock?: boolean; email?: string; name?: string; picture?: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Error de autenticación');
      }

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('nexoprop_user', JSON.stringify(data.user));
        // Disparar evento para recargar la base de datos con el nuevo usuario activo
        window.dispatchEvent(new Event('db-update'));
      } else {
        throw new Error('No se pudo iniciar sesión');
      }
    } catch (err) {
      console.error('Error de login:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nexoprop_user');
    window.dispatchEvent(new Event('db-update'));
  };

  const switchRole = async (newRole: 'Broker' | 'Administrador') => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, role: newRole }),
      });

      if (res.ok) {
        const updatedUser: User = { ...user, role: newRole };
        setUser(updatedUser);
        localStorage.setItem('nexoprop_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('db-update'));
      }
    } catch (err) {
      console.error('Error al cambiar rol:', err);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  console.log(googleClientId)
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        switchRole,
        googleClientId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};
