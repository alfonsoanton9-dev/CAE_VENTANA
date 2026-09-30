export function formatoNumero(valor: number | null | undefined, decimales = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return valor.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/** Acepta coma o punto decimal. Devuelve undefined si está vacío o no es válido. */
export function parsearNumero(texto: string): number | undefined {
  const limpio = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (limpio === '') return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

export function numeroATexto(valor: number | undefined): string {
  return valor === undefined || !Number.isFinite(valor) ? '' : String(valor).replace('.', ',');
}

/** "AAAA-MM-DD" → "DD/MM/AAAA". */
export function isoAFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** "DD/MM/AAAA" → "AAAA-MM-DD"; undefined si no es una fecha válida. */
export function fechaAIso(texto: string): string | undefined {
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(texto.trim());
  if (!m) return undefined;
  const d = Number(m[1]);
  const mes = Number(m[2]);
  const a = Number(m[3]);
  const fecha = new Date(Date.UTC(a, mes - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== d) return undefined;
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
