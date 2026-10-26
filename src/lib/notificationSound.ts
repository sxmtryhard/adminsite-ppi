// Tono de notificación generado con Web Audio (sin archivos de audio).
// Los navegadores solo permiten sonido después de una interacción del usuario; el contexto
// se crea/reanuda en el primer clic o tecla y a partir de ahí los avisos pueden sonar.

const MUTE_KEY = 'adminsite.notifications.muted';
let ctx: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  return ctx;
};

const unlock = () => {
  void getContext()?.resume().catch(() => undefined);
};

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export const isMuted = (): boolean => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
};

export const setMuted = (muted: boolean): void => {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Sin almacenamiento disponible: la preferencia dura solo esta sesión.
  }
};

/** Dos notas cortas ascendentes, volumen moderado. No hace nada si está silenciado o bloqueado. */
export const playChime = (): void => {
  if (isMuted()) return;
  const audio = getContext();
  if (!audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  [
    { freq: 880, at: 0 },
    { freq: 1318.5, at: 0.14 },
  ].forEach(({ freq, at }) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.35);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.4);
  });
};
