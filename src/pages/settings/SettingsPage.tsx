import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, User, Clock, ShieldCheck, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { BusinessSettings } from '@/types/settings.types';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState<BusinessSettings>({
    studioName: 'XAC Barber Studio',
    phone: '+57 300 000 0000',
    address: 'Medellín, Antioquia',
    openingHour: '08:00',
    closingHour: '20:00',
    slotIntervalMinutes: 45,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Configuración</h1>
        <p className="text-xs text-neutral-400">Administra los datos de la barbería y tu cuenta de acceso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Perfil del Administrador */}
        <div className="md:col-span-1 border border-neutral-800 bg-neutral-950 rounded-xl p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-neutral-200 text-sm font-semibold">
            <User className="h-4 w-4 text-neutral-400" />
            <span>Cuenta de Acceso</span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <p className="text-neutral-500">Correo Electrónico</p>
              <p className="font-mono text-neutral-200 mt-0.5 break-all">{user?.email || 'admin@xacstudio.com'}</p>
            </div>

            <div>
              <p className="text-neutral-500">Rol asignado</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                {user?.role?.toUpperCase() || 'ADMINISTRADOR'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/80">
            <Button
              variant="danger"
              size="sm"
              className="w-full flex items-center justify-center gap-1.5"
              onClick={logout}
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Ajustes del Estudio */}
        <div className="md:col-span-2 border border-neutral-800 bg-neutral-950 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2 text-neutral-200 text-sm font-semibold border-b border-neutral-800/60 pb-3">
            <Building2 className="h-4 w-4 text-neutral-400" />
            <span>Parámetros de XAC Barber Studio</span>
          </div>

          {saved && (
            <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Configuración actualizada correctamente.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Nombre del Negocio"
              value={settings.studioName}
              onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Teléfono de Contacto"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                required
              />

              <Input
                label="Ubicación / Dirección"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                required
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-3">
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                <span>Horarios de Atención y Bloques de Citas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Hora de Apertura"
                  type="time"
                  value={settings.openingHour}
                  onChange={(e) => setSettings({ ...settings, openingHour: e.target.value })}
                  required
                />

                <Input
                  label="Hora de Cierre"
                  type="time"
                  value={settings.closingHour}
                  onChange={(e) => setSettings({ ...settings, closingHour: e.target.value })}
                  required
                />

                <Input
                  label="Intervalo sugerido (min)"
                  type="number"
                  min="15"
                  step="15"
                  value={settings.slotIntervalMinutes}
                  onChange={(e) =>
                    setSettings({ ...settings, slotIntervalMinutes: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800/60 flex justify-end">
              <Button type="submit" size="sm">
                Guardar Parámetros
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};