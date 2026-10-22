/**
 * Exporta filas a CSV compatible con Excel (separador `;` y BOM UTF-8 para tildes).
 * Neutraliza fórmulas (=, +, -, @) para evitar inyección de fórmulas en hojas de cálculo.
 */
export const exportToCSV = <T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers: { key: keyof T; label: string }[]
): boolean => {
  if (!rows.length) return false;

  const escape = (value: unknown) => {
    let s = value === undefined || value === null ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(s) && typeof value !== 'number') s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headerRow = headers.map((h) => escape(h.label)).join(';');
  const dataRows = rows.map((row) => headers.map((h) => escape(row[h.key])).join(';'));
  const csvContent = '﻿' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};
