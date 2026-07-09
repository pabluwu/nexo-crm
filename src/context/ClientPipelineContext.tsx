import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ClientDocument, BankEvaluationDocument, MutuariaEvaluationDocument, MilestoneDocument } from '../types';
import { API_BASE_URL, UPLOADS_BASE_URL } from '../config';

interface ClientPipelineContextType {
  clientsList: ClientDocument[];
  selectedRut: string | null;
  setSelectedRut: (rut: string | null) => void;
  client: ClientDocument | null;
  bankEvaluations: BankEvaluationDocument[];
  mutuariaEvaluations: MutuariaEvaluationDocument[];
  milestones: MilestoneDocument[];
  stagesHistory: any[];
  viewedStage: string;
  setViewedStage: (stage: string) => void;
  loading: boolean;
  error: string | null;
  clientRut: string;
}

const ClientPipelineContext = createContext<ClientPipelineContextType | undefined>(undefined);

// Función recursiva para mapear URLs relativas (/uploads) a absolutas dinámicas
const mapUrls = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads')) {
      return obj.replace(/^\/uploads/, UPLOADS_BASE_URL);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(mapUrls);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = mapUrls(obj[key]);
    }
    return newObj;
  }
  return obj;
};

export const ClientPipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientsList, setClientsList] = useState<ClientDocument[]>([]);
  const [selectedRut, setSelectedRut] = useState<string | null>(null); // Almacena el ID del expediente como string
  const [client, setClient] = useState<ClientDocument | null>(null);
  const [bankEvaluations, setBankEvaluations] = useState<BankEvaluationDocument[]>([]);
  const [mutuariaEvaluations, setMutuariaEvaluations] = useState<MutuariaEvaluationDocument[]>([]);
  const [milestones, setMilestones] = useState<MilestoneDocument[]>([]);
  const [stagesHistory, setStagesHistory] = useState<any[]>([]);
  const [viewedStage, setViewedStage] = useState<string>('reserva');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Métodos de consulta de la API
  const fetchList = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/clients`);
      if (res.ok) {
        const list = await res.json();
        setClientsList(mapUrls(list));
        setError(null);
      }
    } catch (err: any) {
      console.error('Error al consultar lista de clientes:', err);
      setError('Error de conexión con el servidor backend NestJS.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (idStr: string) => {
    try {
      const id = parseInt(idStr, 10);
      if (isNaN(id)) return;

      const res = await fetch(`${API_BASE_URL}/clients/${id}`);
      
      if (res.status === 404) {
        setClient(null);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const mappedData = mapUrls(data);
        setClient(mappedData.client);
        setBankEvaluations(mappedData.bankEvaluations);
        setMutuariaEvaluations(mappedData.mutuariaEvaluations);
        setMilestones(mappedData.milestones);
        setStagesHistory(mappedData.stagesHistory || []);
        
        // Inicializar la etapa vista con la etapa activa real del cliente la primera vez
        if (mappedData.client) {
          setViewedStage(mappedData.client.pipelineState);
        }
      }
    } catch (err) {
      console.error('Error al consultar detalle de cliente:', err);
    }
  };

  // 1. Sincronización inicial y sondeo lento de la lista (cada 10s)
  useEffect(() => {
    fetchList();
    const interval = setInterval(fetchList, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Sincronización inicial y sondeo lento del detalle (cada 8s) al cambiar el ID (selectedRut)
  useEffect(() => {
    if (!selectedRut) {
      setClient(null);
      setBankEvaluations([]);
      setMutuariaEvaluations([]);
      setMilestones([]);
      setStagesHistory([]);
      setViewedStage('reserva');
      return;
    }

    fetchDetail(selectedRut);
    const interval = setInterval(() => fetchDetail(selectedRut), 8000);
    return () => clearInterval(interval);
  }, [selectedRut]);

  // 3. Suscripción a eventos instantáneos de actualización local de base de datos
  useEffect(() => {
    const handleDbUpdate = () => {
      fetchList();
      if (selectedRut) {
        fetchDetail(selectedRut);
      }
    };

    window.addEventListener('db-update', handleDbUpdate);
    return () => window.removeEventListener('db-update', handleDbUpdate);
  }, [selectedRut]);

  // 4. Sincronizar viewedStage con el pipelineState real del cliente cuando se carga por primera vez
  useEffect(() => {
    if (client) {
      setViewedStage(client.pipelineState);
    }
  }, [selectedRut]);

  return (
    <ClientPipelineContext.Provider
      value={{
        clientsList,
        selectedRut,
        setSelectedRut,
        client,
        bankEvaluations,
        mutuariaEvaluations,
        milestones,
        stagesHistory,
        viewedStage,
        setViewedStage,
        loading,
        error,
        clientRut: selectedRut || ''
      }}
    >
      {children}
    </ClientPipelineContext.Provider>
  );
};

export const useClientPipeline = () => {
  const context = useContext(ClientPipelineContext);
  if (!context) {
    throw new Error('useClientPipeline debe utilizarse dentro de un ClientPipelineProvider');
  }
  return context;
};
