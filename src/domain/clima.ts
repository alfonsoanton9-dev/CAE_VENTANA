import { buscarAltitud } from './altitud';
import type { OrigenAltitud, Ubicacion } from './tipos';
import { provinciaDesdeCodigoPostal, ubicacionDeProvincia, zonaPorAltitud, type TablaZonas } from './zonasClimaticas';

export interface ResultadoAltitudExpediente {
  altitudM: number;
  latitud?: number;
  longitud?: number;
  origen: Exclude<OrigenAltitud, 'manual' | ''>;
  detalle: string;
  /** Aviso a mostrar al usuario (p. ej. se ha usado el respaldo de la capital). */
  aviso?: string;
}

export interface EntradaClima {
  direccion: string;
  codigoPostal: string;
  municipio?: string;
}

/**
 * Altitud del emplazamiento: servicios públicos de geocodificación y elevación y,
 * si no hay conexión o no se localiza la dirección, altitud de referencia de la capital (h0).
 */
export async function deducirAltitud(
  entrada: EntradaClima,
  tabla: TablaZonas,
  f?: Parameters<typeof buscarAltitud>[1],
): Promise<ResultadoAltitudExpediente | undefined> {
  const prov = provinciaDesdeCodigoPostal(entrada.codigoPostal, tabla);
  if (!prov) return undefined;
  const r = await buscarAltitud({ direccion: entrada.direccion, codigoPostal: entrada.codigoPostal, municipio: entrada.municipio, provincia: prov.provincia.nombre }, f);
  if (r) {
    return {
      altitudM: r.altitudM,
      latitud: r.latitud,
      longitud: r.longitud,
      origen: r.origen,
      detalle: r.detalle,
      aviso:
        r.origen === 'centro-cp'
          ? 'No se localizó la dirección exacta: la altitud es la del centro del código postal. Revísala si el edificio está en una zona con desnivel.'
          : undefined,
    };
  }
  return {
    altitudM: prov.provincia.altitudReferenciaM,
    origen: 'capital',
    detalle: `Altitud de referencia de la capital (${prov.provincia.capital}, h0 = ${prov.provincia.altitudReferenciaM} m). No se pudo geocodificar la dirección ni consultar la elevación.`,
    aviso: 'No se pudo obtener la altitud de la dirección (¿sin conexión?). Se usa la de la capital de provincia: corrígela a mano si es distinta.',
  };
}

export interface ZonaDeducida {
  texto: string;
  invierno?: 'A' | 'B' | 'C' | 'D' | 'E';
  verano?: 1 | 2 | 3 | 4;
  fueraDeFicha: boolean;
  descripcion: string;
}

export function deducirZona(tabla: TablaZonas, provinciaCodigo: string, altitudM: number | undefined): ZonaDeducida | undefined {
  if (altitudM === undefined || !provinciaCodigo) return undefined;
  const r = zonaPorAltitud(tabla, provinciaCodigo, altitudM);
  if (!r) return undefined;
  return {
    texto: r.zona.texto,
    invierno: r.zona.invierno,
    verano: r.zona.verano,
    fueraDeFicha: r.zona.fueraDeFicha,
    descripcion: `${tabla[provinciaCodigo].nombre}, ${r.altitudRedondeada} m → ${r.zona.texto} (tabla a-Anejo B)`,
  };
}

export function ubicacionParaProvincia(codigo: string): Ubicacion {
  return ubicacionDeProvincia(codigo);
}
