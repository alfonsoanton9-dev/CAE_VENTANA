import type { EstadoExpediente, EstadoObra } from '@/domain/tipos';
import { FLUJO_ESTADO_EXPEDIENTE } from '@/domain/adjuntos';

export const ESTADOS_EXPEDIENTE: ReadonlyArray<{ valor: EstadoExpediente; etiqueta: string }> = FLUJO_ESTADO_EXPEDIENTE.map((x) => ({
  valor: x.valor,
  etiqueta: x.etiqueta,
}));

export const ESTADOS_OBRA: ReadonlyArray<{ valor: EstadoObra; etiqueta: string }> = [
  { valor: 'en-elaboracion', etiqueta: 'Obra en elaboración' },
  { valor: 'finalizada', etiqueta: 'Obra finalizada' },
];

/** @deprecated Usar ESTADOS_EXPEDIENTE */
export const ESTADOS = ESTADOS_EXPEDIENTE;

export function etiquetaEstado(e: EstadoExpediente): string {
  return ESTADOS_EXPEDIENTE.find((x) => x.valor === e)?.etiqueta ?? e;
}

export function tonoEstado(e: EstadoExpediente): 'neutro' | 'primario' | 'ok' | 'aviso' {
  if (e === 'vendido-cobrado') return 'ok';
  if (e === 'verificado') return 'ok';
  if (e === 'en-verificacion') return 'aviso';
  return 'neutro';
}

export function etiquetaEstadoObra(e: EstadoObra): string {
  return ESTADOS_OBRA.find((x) => x.valor === e)?.etiqueta ?? e;
}

export function tonoEstadoObra(e: EstadoObra): 'neutro' | 'primario' | 'ok' {
  return e === 'finalizada' ? 'ok' : 'primario';
}

export function etiquetaTipoSujeto(tipo: 'obligado' | 'delegado' | 'intermediario'): string {
  if (tipo === 'delegado') return 'Sujeto delegado';
  if (tipo === 'intermediario') return 'Intermediario';
  return 'Sujeto obligado';
}

export function etiquetaRolGestor(rol: 'instalador' | 'montador' | 'partner'): string {
  if (rol === 'montador') return 'Montador';
  if (rol === 'partner') return 'Partner';
  return 'Instalador';
}
