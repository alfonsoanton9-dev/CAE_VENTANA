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

/** Sujeto obligado o delegado del expediente (contrato a nivel expediente). */
export interface SujetoObligado {
  tipo: 'obligado' | 'delegado';
  razonSocial: string;
  nifNie: string;
  domicilio: string;
  email: string;
  telefono: string;
  /** Representante legal que firma la ficha. */
  representante: Representante;
}

export const TIPOS_DOCUMENTO = [
  {
    clave: 'fichaFirmada',
    etiqueta: 'Ficha cumplimentada y firmada',
    ayuda: 'Ficha firmada por el representante legal del solicitante de la emisión de CAE.',
  },
  {
    clave: 'declaracionResponsable',
    etiqueta: 'Declaración responsable (Anexo I)',
    ayuda: 'Formalizada por el propietario inicial del ahorro sobre ayudas públicas para la misma actuación.',
  },
  {
    clave: 'facturas',
    etiqueta: 'Facturas justificativas',
    ayuda: 'Facturas de la inversión con descripción detallada de los elementos principales.',
  },
  {
    clave: 'informeFotografico',
    etiqueta: 'Informe fotográfico',
    ayuda: 'Antes y después de la actuación, con identificación de los huecos y ventanas afectados.',
  },
  {
    clave: 'certificadoDirectorObra',
    etiqueta: 'Certificado de dirección de obra',
    ayuda:
      'Incluye: a) cálculo de la envolvente del edificio y de la superficie actuada; b) transmitancias antes y después; c) variables de la fórmula del apartado 3.',
  },
  {
    clave: 'certificadoEficienciaEnergetica',
    etiqueta: 'Certificado de eficiencia energética',
    ayuda:
      'Certificado final del edificio con justificante de registro. Alternativamente, el del estado previo justo antes de la actuación (con registro) que incluya como mejora la actuación objeto del ahorro.',
  },
  {
    clave: 'declaracionPrestacionesCE',
    etiqueta: 'Declaración de prestaciones y marcado CE',
    ayuda: 'Declaración de prestaciones y marcado CE de las ventanas instaladas.',
  },
] as const;

export type ClaveDocumento = (typeof TIPOS_DOCUMENTO)[number]['clave'];

/** Archivo adjunto a un tipo documental de la actuación. */
export interface Adjunto {
  id: string;
  nombre: string;
  mime: string;
  tamanoBytes: number;
  /** Contenido en base64 (sin prefijo data:). Vacío si no se persistió el binario. */
  contenidoBase64: string;
  subidoEn: string;
}

export type DocumentacionActuacion = Record<ClaveDocumento, Adjunto[]>;

/** Estado administrativo del expediente (verificación CAE). */
export type EstadoExpediente = 'borrador' | 'en-elaboracion' | 'verificado';

/** Estado de la obra en una actuación concreta. */
export type EstadoObra = 'en-elaboracion' | 'finalizada';

/**
 * Expediente CAE: contenedor de actuaciones + sujeto obligado/delegado.
 * El cálculo total es la suma de las actuaciones.
 */
export interface Expediente {
  id: string;
  /** Código o nombre interno / nº de referencia del expediente. */
  referencia: string;
  estado: EstadoExpediente;
  sujeto: SujetoObligado;
  notas: string;
  actuaciones: Actuacion[];
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * Unidad de trabajo: un inmueble / referencia catastral con sus ventanas y documentación.
 */
export interface Actuacion {
  id: string;
  /** Etiqueta corta (p. ej. "Vivienda Calle Mayor 12"). */
  etiqueta: string;
  estadoObra: EstadoObra;
  referenciaCatastral: string;
  direccion: string;
  codigoPostal: string;
  municipio: string;
  provincia: string;
  /** Código de provincia (dos primeros dígitos del CP); clave de la tabla de zonas. */
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
  /** Sustituye al Fp de ajustes sólo en esta actuación (vacío = usar ajustes). */
  fpPersonalizado?: number;
  /** Di: duración indicativa (años). Sólo administrativo salvo ajuste opcional. */
  duracionAnios?: number;
  /** Fechas ISO (AAAA-MM-DD). */
  fechaInicio: string;
  fechaFin: string;
  documentacion: DocumentacionActuacion;
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
  anterior: {
    descripcion: string;
    /** Uhi (W/m²·K). */
    transmitancia?: number;
  };
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

export type ExpedienteBorrador = Omit<Expediente, 'id' | 'creadoEn' | 'actualizadoEn' | 'actuaciones'>;
export type ActuacionBorrador = Omit<Actuacion, 'id' | 'creadoEn' | 'actualizadoEn' | 'ventanas'>;

/** Campos de clima / emplazamiento editables en SeccionClima. */
export type CamposClima = Pick<
  Actuacion,
  | 'direccion'
  | 'codigoPostal'
  | 'municipio'
  | 'provincia'
  | 'provinciaCodigo'
  | 'ubicacion'
  | 'altitudM'
  | 'latitud'
  | 'longitud'
  | 'origenClima'
  | 'zonaInvierno'
  | 'zonaVerano'
>;
