import React, { useState } from 'react';
import { createClient } from '../services/db';
import { X, User, ShieldAlert } from 'lucide-react';

interface CreateClientModalProps {
  onClose: () => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({ onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones básicas
    if (!firstName.trim() || !lastName.trim() || !rut.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    // Normalizar RUT para el ID del documento
    const cleanRut = rut.trim().toLowerCase().replace(/\./g, '');
    if (!/^[0-9]+-[0-9k]$/.test(cleanRut)) {
      setError('RUT inválido. Debe ingresar el RUT con guion y dígito verificador, ej: 12345678-9');
      return;
    }

    setSubmitting(true);

    try {
      // Crear expediente de cliente en Firestore (offline-friendly, sin await)
      createClient(
        cleanRut,
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          rut: rut.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim()
        },
        'mock-executive-uid'
      );

      // Cerrar modal
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err: any) {
      console.error('Error al registrar cliente:', err);
      setError('Ocurrió un error al registrar el expediente.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-base">Apertura de Expediente Comercial</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre</label>
              <input
                type="text"
                placeholder="Ej. Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Apellidos</label>
              <input
                type="text"
                placeholder="Ej. Pérez Silva"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* RUT */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">RUT (ID Chileno)</label>
              <input
                type="text"
                placeholder="Ej. 12345678-k"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Teléfono</label>
              <input
                type="text"
                placeholder="Ej. +56 9 8765 4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email</label>
            <input
              type="email"
              placeholder="Ej. juan.perez@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Domicilio */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Domicilio Particular</label>
            <input
              type="text"
              placeholder="Ej. Av. Andrés Bello 2711, Las Condes"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-5 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Creando...' : 'Crear Expediente'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
