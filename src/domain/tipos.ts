export const ZONAS_INVIERNO = ['A', 'B', 'C', 'D', 'E'] as const;
export const ZONAS_VERANO = [1, 2, 3, 4] as const;

export type ZonaInvierno = (typeof ZONAS_INVIERNO)[number];
export type ZonaVerano = (typeof ZONAS_VERANO)[number];

export const UBICACIONES = [
  { valor: 'peninsula', etiqueta: 'Península' },
  { valor: 'baleares', etiqueta: 'Illes Balears' },
  { valor: 'ceuta', etiqueta: 'Ceuta' },
  { valor: 'melilla', etiqueta: 'Melilla' },
  { valor: 'canarias', etiqueta: 'Canarias (fuera de la ficha)' },
] as const;
export type Ubicacion = (typeof UBICACIONES)[number]['valor'];

export const TIPOS_HUECO = [
  { valor: 'ventana', etiqueta: 'Ventana' },
  { valor: 'puerta-ventana', etiqueta: 'Puerta-ventana' },
  { valor: 'lucernario', etiqueta: 'Lucernario' },
] as const;
export type TipoHueco = (typeof TIPOS_HUECO)[number]['valor'];

export const MATERIALES_MARCO = [
  { valor: 'pvc', etiqueta: 'PVC', metalico: false },
  { valor: 'madera', etiqueta: 'Madera', metalico: false },
  { valor: 'aluminio', etiqueta: 'Aluminio', metalico: true },
  { valor: 'acero', etiqueta: 'Acero', metalico: true },
  { valor: 'mixto', etiqueta: 'Mixto (madera-aluminio…)', metalico: false },
] as const;
export type MaterialMarco = (typeof MATERIALES_MARCO)[number]['valor'];

export const ORIENTACIONES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;
export type Orientacion = (typeof ORIENTACIONES)[number];

/** Clase de permeabilidad al aire según UNE-EN 12207:2016 (0 = sin clasificar). */
export type ClasePermeabilidad = 0 | 1 | 2 | 3 | 4;

export type OrigenProvincia = 'codigo-postal' | 'manual' | '';
export type OrigenAltitud = 'geocodificacion' | 'centro-cp' | 'capital' | 'manual' | '';
export type OrigenZona = 'automatica' | 'manual';

/** Trazabilidad de los datos que se deducen automáticamente. */
export interface OrigenClima {
  provincia: OrigenProvincia;
  altitud: OrigenAltitud;
  /** Texto libre: servicios usados, coordenadas, fecha… */
  altitudDetalle: string;
  zona: OrigenZona;
}

export interface Cliente {
  nombre: string;
  nifNie: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface Representante {
  nombre: string;
  nifNie: string;
}

export interface DocumentacionChecklist {
  fichaFirmada: boolean;
  declaracionResponsable: boolean;
  facturas: boolean;
  informeFotografico: boolean;
  certificadoDirectorObra: boolean;
  certificadoEficienciaEnergetica: boolean;
  declaracionPrestacionesCE: boolean;
}

export type EstadoExpediente = 'borrador' | 'en-curso' | 'finalizado';

export interface Expediente {
  id: string;
  /** Código o nombre interno del expediente. */
  referencia: string;
  estado: EstadoExpediente;
  /** Referencia catastral: agrupa las ventanas (n) de la fórmula. */
  referenciaCatastral: string;
  direccion: string;
  codigoPostal: string;
  municipio: string;
  provincia: string;
  /** Código de provincia (dos primeros dígitos del código postal); clave de la tabla de zonas. */
  provinciaCodigo: string;
  ubicacion: Ubicacion;
  altitudM?: number;
  latitud?: number;
  longitud?: number;
  origenClima: OrigenClima;
  zonaInvierno?: ZonaInvierno;
  zonaVerano?: ZonaVerano;
  edificioExistente: boolean;
  usoResidencialPrivado: boolean;
  /** Superficie total de la envolvente térmica final del edificio (m²). */
  superficieEnvolventeM2?: number;
  cliente: Cliente;
  propietarioAhorro: string;
  representante: Representante;
  /** Sustituye al Fp de ajustes sólo en este expediente (vacío = usar ajustes). */
  fpPersonalizado?: number;
  /** Di: duración indicativa de la actuación (años). Sólo administrativo. */
  duracionAnios?: number;
  /** Fechas ISO (AAAA-MM-DD). */
  fechaInicio: string;
  fechaFin: string;
  documentacion: DocumentacionChecklist;
  notas: string;
  ventanas: Ventana[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface Ventana {
  id: string;
  /** Etiqueta identificativa (p. ej. "V1 – Salón"). */
  etiqueta: string;
  tipo: TipoHueco;
  estancia: string;
  planta: string;
  orientacion?: Orientacion;
  unidades: number;
  /** Superficie del hueco por unidad (m²). */
  superficieM2?: number;
  /** Situación anterior. */
  anterior: {
    descripcion: string;
    /** Uhi (W/m²·K). */
    transmitancia?: number;
  };
  /** Situación nueva. */
  nueva: {
    descripcion: string;
    /** Uhf (W/m²·K). */
    transmitancia?: number;
    materialMarco: MaterialMarco;
    roturaPuenteTermicoMm?: number;
    clasePermeabilidad: ClasePermeabilidad;
    marcadoCE: boolean;
    tienePersiana: boolean;
    claseCajonPersiana: ClasePermeabilidad;
    transmitanciaCajon?: number;
  };
  notas: string;
}

export type ExpedienteBorrador = Omit<Expediente, 'id' | 'creadoEn' | 'actualizadoEn' | 'ventanas'>;
