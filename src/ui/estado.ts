import type { EstadoExpediente, EstadoObra } from '@/domain/tipos';

export const ESTADOS_EXPEDIENTE: ReadonlyArray<{ valor: EstadoExpediente; etiqueta: string }> = [
  { valor: 'borrador', etiqueta: 'Borrador' },
  { valor: 'en-elaboracion', etiqueta: 'En elaboración' },
  { valor: 'verificado', etiqueta: 'Verificado' },
];

export const ESTADOS_OBRA: ReadonlyArray<{ valor: EstadoObra; etiqueta: string }> = [
  { valor: 'en-elaboracion', etiqueta: 'Obra en elaboración' },
  { valor: 'finalizada', etiqueta: 'Obra finalizada' },
];

/** @deprecated Usar ESTADOS_EXPEDIENTE */
export const ESTADOS = ESTADOS_EXPEDIENTE;

export function etiquetaEstado(e: EstadoExpediente): string {
  return ESTADOS_EXPEDIENTE.find((x) => x.valor === e)?.etiqueta ?? e;
}

export function tonoEstado(e: EstadoExpediente): 'neutro' | 'primario' | 'ok' {
  return e === 'verificado' ? 'ok' : e === 'en-elaboracion' ? 'primario' : 'neutro';
}

export function etiquetaEstadoObra(e: EstadoObra): string {
  return ESTADOS_OBRA.find((x) => x.valor === e)?.etiqueta ?? e;
}

export function tonoEstadoObra(e: EstadoObra): 'neutro' | 'primario' | 'ok' {
  return e === 'finalizada' ? 'ok' : 'primario';
}
