import { settingsService } from '@/services/firebase/settings.service';
import { DEFAULT_SETTINGS } from '@/types/settings.types';
import { useAsync } from './useAsync';

/** Configuración del negocio (políticas de reserva y cancelación). */
export const useSettings = () => {
  const { data, loading, error, reload } = useAsync(() => settingsService.get(), []);
  return {
    settings: data?.settings ?? DEFAULT_SETTINGS,
    saved: data?.saved ?? false,
    loading,
    error,
    reload,
  };
};
