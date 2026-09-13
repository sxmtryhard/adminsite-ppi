export const exportToCSV = <T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers: { key: keyof T; label: string }[]
) => {
  if (!rows || !rows.length) {
    alert('No hay datos disponibles para exportar.');
    return;
  }

  // Separador de columnas por coma y escape de comillas
  const headerRow = headers.map((h) => `"${h.label}"`).join(';');
  const dataRows = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key];
        const stringVal = val !== undefined && val !== null ? String(val) : '';
        return `"${stringVal.replace(/"/g, '""')}"`;
      })
      .join(';')
  );

  // \uFEFF añade el BOM (Byte Order Mark) para que Excel reconozca tildes y caracteres especiales
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};