import type { Expediente, ExpedienteBorrador, Ventana } from './tipos';

export function generarId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function borradorVacio(): ExpedienteBorrador {
  return {
    referencia: '',
    estado: 'borrador',
    referenciaCatastral: '',
    direccion: '',
    codigoPostal: '',
    municipio: '',
    provincia: '',
    ubicacion: 'peninsula',
    altitudM: undefined,
    zonaInvierno: undefined,
    zonaVerano: undefined,
    edificioExistente: true,
    usoResidencialPrivado: true,
    superficieEnvolventeM2: undefined,
    cliente: { nombre: '', nifNie: '', telefono: '', email: '', direccion: '' },
    propietarioAhorro: '',
    representante: { nombre: '', nifNie: '' },
    fpPersonalizado: undefined,
    duracionAnios: undefined,
    fechaInicio: '',
    fechaFin: '',
    documentacion: {
      fichaFirmada: false,
      declaracionResponsable: false,
      facturas: false,
      informeFotografico: false,
      certificadoDirectorObra: false,
      certificadoEficienciaEnergetica: false,
      declaracionPrestacionesCE: false,
    },
    notas: '',
  };
}

export function nuevoExpediente(borrador: ExpedienteBorrador): Expediente {
  const ahora = new Date().toISOString();
  return { ...borrador, id: generarId(), ventanas: [], creadoEn: ahora, actualizadoEn: ahora };
}

export function ventanaVacia(numero = 1): Ventana {
  return {
    id: generarId(),
    etiqueta: `V${numero}`,
    tipo: 'ventana',
    estancia: '',
    planta: '',
    orientacion: undefined,
    unidades: 1,
    superficieM2: undefined,
    anterior: { descripcion: '', transmitancia: undefined },
    nueva: {
      descripcion: '',
      transmitancia: undefined,
      materialMarco: 'pvc',
      roturaPuenteTermicoMm: undefined,
      clasePermeabilidad: 0,
      marcadoCE: false,
      tienePersiana: false,
      claseCajonPersiana: 0,
      transmitanciaCajon: undefined,
    },
    notas: '',
  };
}

export function duplicarVentana(v: Ventana): Ventana {
  return {
    ...JSON.parse(JSON.stringify(v)),
    id: generarId(),
    etiqueta: `${v.etiqueta} (copia)`,
  };
}

export function duplicarExpediente(e: Expediente): Expediente {
  const ahora = new Date().toISOString();
  const copia: Expediente = JSON.parse(JSON.stringify(e));
  copia.id = generarId();
  copia.referencia = `${e.referencia} (copia)`;
  copia.ventanas = copia.ventanas.map((v) => ({ ...v, id: generarId() }));
  copia.creadoEn = ahora;
  copia.actualizadoEn = ahora;
  return copia;
}
