/**
 * Documento `config/business`. Los valores por defecto son parámetros configurables,
 * no políticas aprobadas por el negocio.
 */
export interface BusinessSettings {
  studioName: string;
  phone: string;
  address: string;
  currency: 'COP';
  timezone: 'America/Bogota';
  /** Horas mínimas de antelación para que un cliente cancele o reprograme. */
  cancellationMinHours: number;
  /** Minutos mínimos de antelación para reservar. */
  minLeadMinutes: number;
  /** Días hacia adelante en los que se aceptan reservas. */
  bookingWindowDays: number;
  /** Umbral de existencias bajas por defecto para productos nuevos. */
  defaultMinStock: number;
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  studioName: 'XAC Barber Studio',
  phone: '',
  address: '',
  currency: 'COP',
  timezone: 'America/Bogota',
  cancellationMinHours: 3,
  minLeadMinutes: 60,
  bookingWindowDays: 30,
  defaultMinStock: 5,
};
