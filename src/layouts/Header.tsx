import React from 'react';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/common/Button';

export const Header: React.FC = () => {
  return (
    <header className="h-14 border-b border-border/50 px-6 flex items-center justify-between bg-neutral-950/40 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3 w-72">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar clientes, citas o servicios..."
            className="w-full h-8 pl-8 pr-3 rounded-md bg-neutral-900/60 border border-border/60 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="relative h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
        </button>

        <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
          + Nueva Cita
        </Button>
      </div>
    </header>
  );
};