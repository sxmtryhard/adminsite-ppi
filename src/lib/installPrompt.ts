import { useSyncExternalStore } from 'react';

/**
 * Instalación de la app (PWA). Chrome/Edge disparan `beforeinstallprompt` una sola vez y muy
 * temprano, así que el evento se captura al cargar este módulo (importado en main.tsx) y se
 * guarda hasta que el usuario pulse "Instalar". Safari en iPhone no tiene ese evento: allí se
 * muestran los pasos manuales (Compartir → Agregar a pantalla de inicio).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const isStandalone = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIos = (): boolean =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'unavailable';

const getMode = (): InstallMode => {
  if (installed || isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  if (isIos()) return 'ios';
  return 'unavailable';
};

/** Abre el diálogo nativo de instalación. Devuelve true si el usuario aceptó. */
export const promptInstall = async (): Promise<boolean> => {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
};

export const useInstallMode = (): InstallMode => useSyncExternalStore(subscribe, getMode, () => 'unavailable');
