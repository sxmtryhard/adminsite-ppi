import { useSyncExternalStore } from 'react';
import { brandingService } from '@/services/firebase/branding.service';

/** Una sola suscripción compartida al logo; todos los componentes se actualizan al cambiarlo. */
let logo: string | null = null;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  unsubscribe ??= brandingService.subscribe((next) => {
    logo = next;
    listeners.forEach((l) => l());
  });
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
};

export const useLogo = (): string | null => useSyncExternalStore(subscribe, () => logo, () => null);
