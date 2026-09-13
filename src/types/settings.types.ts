export interface BusinessSettings {
  studioName: string;
  phone: string;
  address: string;
  openingHour: string; // ej. "09:00"
  closingHour: string; // ej. "20:00"
  slotIntervalMinutes: number; // ej. 30 o 45
}