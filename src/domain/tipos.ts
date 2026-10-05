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

/** Sujeto obligado, delegado o intermediario comprador del CAE. */
export interface SujetoObligado {
  tipo: 'obligado' | 'delegado' | 'intermediario';
  razonSocial: string;
  nifNie: string;
  domicilio: string;
  email: string;
  telefono: string;
  /** Representante legal que firma la ficha. */
  representante: Representante;
}

/** Instalador, montador o partner que gestiona la documentación del CAE. */
export interface GestorCae {
  rol: 'instalador' | 'montador' | 'partner';
  razonSocial: string;
  nifNie: string;
  telefono: string;
  email: string;
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

/** Estado del expediente (indicador de flujo; no se edita a mano en el formulario). */
export type EstadoExpediente = 'borrador' | 'en-verificacion' | 'verificado' | 'vendido-cobrado';

/** Estado de la obra en una actuación concreta. */
export type EstadoObra = 'en-elaboracion' | 'finalizada';

/**
 * Expediente CAE: contenedor de actuaciones + sujeto comprador + gestor.
 * El cálculo total es la suma de las actuaciones.
 */
export interface Expediente {
  id: string;
  /** Código o nombre interno / nº de referencia del expediente. */
  referencia: string;
  estado: EstadoExpediente;
  /** SO / SD / intermediario que compra el CAE. */
  sujeto: SujetoObligado;
  /** Instalador, montador o partner que gestiona la documentación del CAE. */
  gestor: GestorCae;
  /**
   * Precio €/MWh·año conseguido con el sujeto obligado/delegado (importe de venta del CAE).
   * ROI del propietario inicial = MWh × este precio.
   */
  valorEconomicoEurPorMWhAnio?: number;
  /**
   * Fee pactado del intermediario/instalador [€/MWh·año]:
   * precio fijo por cada MWh/año aportado a la plataforma en expedientes de sus clientes.
   * ROI intermediario = MWh × fee €/MWh·año.
   */
  feeIntermediarioEurPorMWhAnio?: number;
  /** Validación interna del expediente (previa a enviar a verificación). */
  validado: boolean;
  /** Contrato definitivo aportado al marcar como verificado. */
  contratoDefinitivo?: Adjunto;
  /** Informe técnico aportado al marcar como verificado. */
  informeTecnico?: Adjunto;
  /** Contrato de compraventa del CAE (nivel expediente). */
  contratoCompraventa?: Adjunto;
  /** Nombre / razón social de la certificadora que verifica el CAE. */
  certificadoraNombre: string;
  /** Nº de referencia del expediente en la certificadora. */
  certificadoraReferencia: string;
  /** Datos adicionales de la certificadora (contacto, observaciones…). */
  certificadoraInfo: string;
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
  /**
   * Código libre del instalador de ventanas (referencia de obra / fabricación).
   * Distinto del ID interno de la app.
   */
  codigoInstalador: string;
  /** Etiqueta identificativa (p. ej. "V1 – Salón"). */
  etiqueta: string;
  tipo: TipoHueco;
  estancia: string;
  planta: string;
  orientacion?: Orientacion;
  unidades: number;
  /** Superficie del hueco por unidad (m²). */
  superficieM2?: number;
  /** Foto del hueco antes de la sustitución. */
  fotoAntes?: Adjunto;
  /** Foto del hueco después de la sustitución. */
  fotoDespues?: Adjunto;
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

/**
 * Rol del usuario de la aplicación respecto al CAE.
 * Intermediario e instalador son el mismo perfil de negocio (gestionan el CAE de un tercero).
 */
export type RolUsuario = 'propietario-inicial' | 'intermediario-instalador';

export const ROLES_USUARIO = [
  { valor: 'propietario-inicial' as const, etiqueta: 'Propietario inicial del ahorro' },
  { valor: 'intermediario-instalador' as const, etiqueta: 'Intermediario / instalador' },
];

/** Intermediario e instalador comparten las mismas reglas de negocio. */
export function esIntermediarioInstalador(rol: RolUsuario | string | undefined): boolean {
  return rol === 'intermediario-instalador' || rol === 'intermediario' || rol === 'instalador';
}

export function normalizarRolUsuario(rol: unknown): RolUsuario {
  if (rol === 'propietario-inicial') return 'propietario-inicial';
  return 'intermediario-instalador';
}

export const CARGOS_FIRMA = [
  { valor: 'representante-legal', etiqueta: 'Representante legal' },
  { valor: 'apoderado', etiqueta: 'Apoderado' },
  { valor: 'administrador', etiqueta: 'Administrador' },
  { valor: 'director', etiqueta: 'Director / gerente' },
  { valor: 'otro', etiqueta: 'Otro cargo con facultad de firma' },
] as const;

export type CargoFirma = (typeof CARGOS_FIRMA)[number]['valor'];

/**
 * Perfil del usuario de la app (espacio personal).
 * El SO/SD (contraparte) va en cada expediente, no aquí.
 * El fee pactado (solo intermediario/instalador) se usa en el contrato y se arrastra a expedientes.
 */
export interface UsuarioPerfil {
  nombre: string;
  nifNie: string;
  telefono: string;
  email: string;
  direccion: string;
  cargoFirma: CargoFirma;
  cargoFirmaOtro: string;
  sociedad: string;
  nifSociedad: string;
  domicilioSociedad: string;
  rol: RolUsuario;
  /**
   * Fee pactado [€/MWh·año] del contrato de colaboración (solo intermediario/instalador).
   * Precio por cada MWh/año que aportan a la plataforma como expedientes de sus clientes.
   * Se autocompleta en el contrato y prellena expedientes.
   * El propietario inicial no tiene fee: su ROI es el importe de venta del CAE.
   */
  feePactadoEurPorMWhAnio?: number;
  /** Contrato firmado adjunto (PDF/imagen), típico si es intermediario/instalador. */
  contratoColaboracion?: Adjunto;
  /** Marca de que el contrato generado en app se considera aceptado/firmado. */
  contratoGeneradoAceptado: boolean;
  actualizadoEn: string;
}

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
