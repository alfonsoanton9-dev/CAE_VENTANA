import { TIPOS_DOCUMENTO, type Adjunto, type Expediente } from './tipos';

export type GrupoDocumentacion =
  | 'contratos'
  | 'verificacion'
  | 'actuacion-docs'
  | 'fotos-ventanas'
  | 'otros';

export interface ItemDocumentacion {
  id: string;
  grupo: GrupoDocumentacion;
  orden: number;
  titulo: string;
  origen: string;
  adjunto: Adjunto;
}

const ORDEN_GRUPO: Record<GrupoDocumentacion, number> = {
  contratos: 1,
  verificacion: 2,
  'actuacion-docs': 3,
  'fotos-ventanas': 4,
  otros: 5,
};

export const ETIQUETA_GRUPO: Record<GrupoDocumentacion, string> = {
  contratos: '1. Contratos',
  verificacion: '2. Verificación / certificadora',
  'actuacion-docs': '3. Documentación de actuaciones (apartado 5)',
  'fotos-ventanas': '4. Evidencias fotográficas de ventanas',
  otros: '5. Otros',
};

function item(grupo: GrupoDocumentacion, titulo: string, origen: string, adjunto: Adjunto): ItemDocumentacion {
  return {
    id: adjunto.id,
    grupo,
    orden: ORDEN_GRUPO[grupo],
    titulo,
    origen,
    adjunto,
  };
}

/** Inventario ordenado de toda la documentación del expediente. */
export function inventariarDocumentacion(e: Expediente): ItemDocumentacion[] {
  const items: ItemDocumentacion[] = [];

  if (e.contratoCompraventa) {
    items.push(item('contratos', 'Contrato de compraventa CAE (PDF firmado)', e.referencia, e.contratoCompraventa));
  }
  if (e.firmaContratoCompraventa) {
    items.push(item('contratos', 'Firma electrónica del contrato de compraventa', e.referencia, e.firmaContratoCompraventa));
  }
  if (e.contratoDefinitivo) {
    items.push(item('verificacion', 'Contrato definitivo de verificación', e.referencia, e.contratoDefinitivo));
  }
  if (e.informeTecnico) {
    items.push(item('verificacion', 'Informe técnico de verificación', e.referencia, e.informeTecnico));
  }

  for (const a of e.actuaciones) {
    const etiquetaAct = a.etiqueta || 'Actuación';
    if (a.firmaDeclaracionResponsable) {
      items.push(
        item('actuacion-docs', 'Firma electrónica Anexo I (declaración responsable)', etiquetaAct, a.firmaDeclaracionResponsable),
      );
    }
    for (const tipo of TIPOS_DOCUMENTO) {
      for (const adj of a.documentacion[tipo.clave] ?? []) {
        items.push(item('actuacion-docs', tipo.etiqueta, etiquetaAct, adj));
      }
    }
    for (const v of a.ventanas) {
      const etiqV = v.etiqueta || v.codigoInstalador || 'Ventana';
      if (v.fotoAntes) items.push(item('fotos-ventanas', `Foto antes — ${etiqV}`, etiquetaAct, v.fotoAntes));
      if (v.fotoDespues) items.push(item('fotos-ventanas', `Foto después — ${etiqV}`, etiquetaAct, v.fotoDespues));
    }
  }

  return items.sort((x, y) => x.orden - y.orden || x.titulo.localeCompare(y.titulo, 'es'));
}

export function agruparDocumentacion(items: ItemDocumentacion[]): Array<{ grupo: GrupoDocumentacion; etiqueta: string; items: ItemDocumentacion[] }> {
  const mapa = new Map<GrupoDocumentacion, ItemDocumentacion[]>();
  for (const it of items) {
    const arr = mapa.get(it.grupo) ?? [];
    arr.push(it);
    mapa.set(it.grupo, arr);
  }
  return (Object.keys(ORDEN_GRUPO) as GrupoDocumentacion[]).map((g) => ({
    grupo: g,
    etiqueta: ETIQUETA_GRUPO[g],
    items: mapa.get(g) ?? [],
  }));
}
