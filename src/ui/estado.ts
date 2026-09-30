import type { EstadoExpediente } from '@/domain/tipos';

export const ESTADOS: ReadonlyArray<{ valor: EstadoExpediente; etiqueta: string }> = [
  { valor: 'borrador', etiqueta: 'Borrador' },
  { valor: 'en-curso', etiqueta: 'En curso' },
  { valor: 'finalizado', etiqueta: 'Finalizado' },
];

export function etiquetaEstado(e: EstadoExpediente): string {
  return ESTADOS.find((x) => x.valor === e)?.etiqueta ?? e;
}

export function tonoEstado(e: EstadoExpediente): 'neutro' | 'primario' | 'ok' {
  return e === 'finalizado' ? 'ok' : e === 'en-curso' ? 'primario' : 'neutro';
}
