import type {
  Actuacion,
  ActuacionBorrador,
  DocumentacionActuacion,
  EstadoExpediente,
  Expediente,
  ExpedienteBorrador,
  GestorCae,
  SujetoObligado,
  Ventana,
} from './tipos';

export function generarId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function documentacionVacia(): DocumentacionActuacion {
  return {
    fichaFirmada: [],
    declaracionResponsable: [],
    facturas: [],
    informeFotografico: [],
    certificadoDirectorObra: [],
    certificadoEficienciaEnergetica: [],
    declaracionPrestacionesCE: [],
  };
}

export function sujetoVacio(): SujetoObligado {
  return {
    tipo: 'obligado',
    razonSocial: '',
    nifNie: '',
    domicilio: '',
    email: '',
    telefono: '',
    representante: { nombre: '', nifNie: '' },
  };
}

export function gestorVacio(): GestorCae {
  return {
    rol: 'instalador',
    razonSocial: '',
    nifNie: '',
    telefono: '',
    email: '',
  };
}

function migrarEstado(estado: string | undefined): EstadoExpediente {
  if (estado === 'en-verificacion' || estado === 'verificado' || estado === 'vendido-cobrado' || estado === 'borrador') return estado;
  if (estado === 'finalizado') return 'verificado';
  if (estado === 'en-elaboracion' || estado === 'en-curso') return 'en-verificacion';
  return 'borrador';
}

export function borradorExpedienteVacio(): ExpedienteBorrador {
  return {
    referencia: '',
    estado: 'borrador',
    sujeto: sujetoVacio(),
    gestor: gestorVacio(),
    valorEconomicoEurPorMWhAnio: undefined,
    feeIntermediarioEurPorMWhAnio: undefined,
    validado: false,
    contratoDefinitivo: undefined,
    informeTecnico: undefined,
    contratoCompraventa: undefined,
    certificadoraNombre: '',
    certificadoraReferencia: '',
    certificadoraInfo: '',
    notas: '',
  };
}

export function borradorActuacionVacio(): ActuacionBorrador {
  return {
    etiqueta: '',
    estadoObra: 'en-elaboracion',
    referenciaCatastral: '',
    direccion: '',
    codigoPostal: '',
    municipio: '',
    provincia: '',
    provinciaCodigo: '',
    ubicacion: 'peninsula',
    altitudM: undefined,
    latitud: undefined,
    longitud: undefined,
    origenClima: { provincia: '', altitud: '', altitudDetalle: '', zona: 'automatica' },
    zonaInvierno: undefined,
    zonaVerano: undefined,
    edificioExistente: true,
    usoResidencialPrivado: true,
    superficieEnvolventeM2: undefined,
    cliente: { nombre: '', nifNie: '', telefono: '', email: '', direccion: '' },
    propietarioAhorro: '',
    fpPersonalizado: undefined,
    duracionAnios: undefined,
    fechaInicio: '',
    fechaFin: '',
    documentacion: documentacionVacia(),
    notas: '',
  };
}

/** @deprecated Usar borradorExpedienteVacio. Alias de compatibilidad temporal. */
export const borradorVacio = borradorExpedienteVacio;

export function nuevoExpediente(borrador: ExpedienteBorrador): Expediente {
  const ahora = new Date().toISOString();
  return { ...borrador, id: generarId(), actuaciones: [], creadoEn: ahora, actualizadoEn: ahora };
}

export function nuevaActuacion(borrador: ActuacionBorrador): Actuacion {
  const ahora = new Date().toISOString();
  return { ...borrador, id: generarId(), ventanas: [], creadoEn: ahora, actualizadoEn: ahora };
}

export function ventanaVacia(numero = 1): Ventana {
  return {
    id: generarId(),
    codigoInstalador: '',
    etiqueta: `V${numero}`,
    tipo: 'ventana',
    estancia: '',
    planta: '',
    orientacion: undefined,
    unidades: 1,
    superficieM2: undefined,
    fotoAntes: undefined,
    fotoDespues: undefined,
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

export function duplicarActuacion(a: Actuacion): Actuacion {
  const ahora = new Date().toISOString();
  const copia: Actuacion = JSON.parse(JSON.stringify(a));
  copia.id = generarId();
  copia.etiqueta = `${a.etiqueta || 'Actuación'} (copia)`;
  copia.ventanas = copia.ventanas.map((v) => ({ ...v, id: generarId() }));
  copia.creadoEn = ahora;
  copia.actualizadoEn = ahora;
  return copia;
}

export function duplicarExpediente(e: Expediente): Expediente {
  const ahora = new Date().toISOString();
  const copia: Expediente = JSON.parse(JSON.stringify(e));
  copia.id = generarId();
  copia.referencia = `${e.referencia} (copia)`;
  copia.actuaciones = copia.actuaciones.map((a) => duplicarActuacion(a));
  copia.creadoEn = ahora;
  copia.actualizadoEn = ahora;
  return copia;
}

/** Completa expedientes guardados con versiones anteriores de la app (v2+). */
export function normalizarExpediente(e: Expediente): Expediente {
  const raw = e as Expediente & { feeIntermediarioPct?: number };
  const { feeIntermediarioPct: _feePct, ...resto } = raw;
  return {
    ...resto,
    estado: migrarEstado(e.estado),
    sujeto: e.sujeto ?? sujetoVacio(),
    gestor: e.gestor ?? gestorVacio(),
    feeIntermediarioEurPorMWhAnio:
      typeof e.feeIntermediarioEurPorMWhAnio === 'number' ? e.feeIntermediarioEurPorMWhAnio : undefined,
    validado: typeof e.validado === 'boolean' ? e.validado : false,
    contratoDefinitivo: e.contratoDefinitivo,
    informeTecnico: e.informeTecnico,
    contratoCompraventa: e.contratoCompraventa,
    certificadoraNombre: e.certificadoraNombre ?? '',
    certificadoraReferencia: e.certificadoraReferencia ?? '',
    certificadoraInfo: e.certificadoraInfo ?? '',
    actuaciones: (e.actuaciones ?? []).map(normalizarActuacion),
  };
}

export function normalizarActuacion(a: Actuacion): Actuacion {
  const zonaManual = a.zonaInvierno !== undefined && a.zonaVerano !== undefined;
  const docs = a.documentacion ?? documentacionVacia();
  return {
    ...a,
    provinciaCodigo: a.provinciaCodigo ?? '',
    origenClima: a.origenClima ?? {
      provincia: a.provincia ? 'manual' : '',
      altitud: a.altitudM !== undefined ? 'manual' : '',
      altitudDetalle: '',
      zona: zonaManual ? 'manual' : 'automatica',
    },
    documentacion: {
      fichaFirmada: docs.fichaFirmada ?? [],
      declaracionResponsable: docs.declaracionResponsable ?? [],
      facturas: docs.facturas ?? [],
      informeFotografico: docs.informeFotografico ?? [],
      certificadoDirectorObra: docs.certificadoDirectorObra ?? [],
      certificadoEficienciaEnergetica: docs.certificadoEficienciaEnergetica ?? [],
      declaracionPrestacionesCE: docs.declaracionPrestacionesCE ?? [],
    },
    ventanas: (a.ventanas ?? []).map(normalizarVentana),
  };
}

export function normalizarVentana(v: Ventana): Ventana {
  return {
    ...v,
    codigoInstalador: v.codigoInstalador ?? '',
  };
}

function adjuntoMarcador(nombre: string): import('./tipos').Adjunto {
  return {
    id: generarId(),
    nombre,
    mime: 'application/pdf',
    tamanoBytes: 0,
    contenidoBase64: '',
    subidoEn: new Date().toISOString(),
  };
}

/** Expediente de ejemplo completo para tutorial / primera carga. */
export function crearExpedienteTutorial(): Expediente {
  const ahora = new Date().toISOString();
  const v1: Ventana = {
    ...ventanaVacia(1),
    codigoInstalador: 'INST-MAD-001',
    etiqueta: 'V1 – Salón',
    tipo: 'ventana',
    estancia: 'Salón',
    planta: '1',
    orientacion: 'S',
    unidades: 1,
    superficieM2: 2.1,
    anterior: { descripcion: 'Ventana simple cristal 4 mm, marco aluminio sin RPT', transmitancia: 5.7 },
    nueva: {
      descripcion: 'PVC 5 cámaras, doble acristalamiento 4/16/4 bajo emisivo',
      transmitancia: 1.4,
      materialMarco: 'pvc',
      roturaPuenteTermicoMm: undefined,
      clasePermeabilidad: 3,
      marcadoCE: true,
      tienePersiana: true,
      claseCajonPersiana: 4,
      transmitanciaCajon: 1.2,
    },
    notas: 'Hueco principal del salón a la calle.',
  };
  const v2: Ventana = {
    ...ventanaVacia(2),
    codigoInstalador: 'INST-MAD-002',
    etiqueta: 'V2 – Dormitorio',
    tipo: 'ventana',
    estancia: 'Dormitorio principal',
    planta: '1',
    orientacion: 'E',
    unidades: 2,
    superficieM2: 1.2,
    anterior: { descripcion: 'Ventana corredera aluminio', transmitancia: 5.2 },
    nueva: {
      descripcion: 'PVC oscilobatiente 4/16/4',
      transmitancia: 1.5,
      materialMarco: 'pvc',
      roturaPuenteTermicoMm: undefined,
      clasePermeabilidad: 3,
      marcadoCE: true,
      tienePersiana: false,
      claseCajonPersiana: 0,
      transmitanciaCajon: undefined,
    },
    notas: 'Dos huecos idénticos en el mismo dormitorio.',
  };
  const v3: Ventana = {
    ...ventanaVacia(3),
    codigoInstalador: 'INST-MAD-003',
    etiqueta: 'V3 – Cocina (puerta-ventana)',
    tipo: 'puerta-ventana',
    estancia: 'Cocina',
    planta: 'Baja',
    orientacion: 'O',
    unidades: 1,
    superficieM2: 3.6,
    anterior: { descripcion: 'Puerta-ventana madera antigua', transmitancia: 4.0 },
    nueva: {
      descripcion: 'Aluminio con RPT 20 mm, vidrio 6/16/4',
      transmitancia: 1.8,
      materialMarco: 'aluminio',
      roturaPuenteTermicoMm: 20,
      clasePermeabilidad: 3,
      marcadoCE: true,
      tienePersiana: false,
      claseCajonPersiana: 0,
      transmitanciaCajon: undefined,
    },
    notas: '',
  };

  const actuacion1: Actuacion = {
    id: generarId(),
    etiqueta: 'Vivienda Calle Mayor 18, 3º B',
    estadoObra: 'finalizada',
    referenciaCatastral: '9872023VH5797S0001WX',
    direccion: 'Calle Mayor 18, 3º B',
    codigoPostal: '28013',
    municipio: 'Madrid',
    provincia: 'Madrid',
    provinciaCodigo: '28',
    ubicacion: 'peninsula',
    altitudM: 655,
    latitud: 40.4168,
    longitud: -3.7038,
    origenClima: {
      provincia: 'codigo-postal',
      altitud: 'manual',
      altitudDetalle: 'Altitud de ejemplo (tutorial).',
      zona: 'automatica',
    },
    zonaInvierno: 'D',
    zonaVerano: 3,
    edificioExistente: true,
    usoResidencialPrivado: true,
    superficieEnvolventeM2: 420,
    cliente: {
      nombre: 'María López García',
      nifNie: '12345678Z',
      telefono: '600123456',
      email: 'maria.lopez@ejemplo.es',
      direccion: 'Calle Mayor 18, 3º B, 28013 Madrid',
    },
    propietarioAhorro: 'María López García',
    fpPersonalizado: undefined,
    duracionAnios: 20,
    fechaInicio: '2025-09-01',
    fechaFin: '2025-09-18',
    documentacion: {
      fichaFirmada: [adjuntoMarcador('Ficha_RES070_firmada.pdf')],
      declaracionResponsable: [adjuntoMarcador('Anexo_I_declaracion_responsable.pdf')],
      facturas: [adjuntoMarcador('Factura_Ventanas_SA_001.pdf'), adjuntoMarcador('Factura_Instalacion_002.pdf')],
      informeFotografico: [adjuntoMarcador('Informe_fotografico_antes_despues.pdf')],
      certificadoDirectorObra: [adjuntoMarcador('Certificado_direccion_obra.pdf')],
      certificadoEficienciaEnergetica: [adjuntoMarcador('CEE_registro.pdf')],
      declaracionPrestacionesCE: [adjuntoMarcador('Declaracion_prestaciones_marcado_CE.pdf')],
    },
    notas: 'Actuación de ejemplo del tutorial: tres tipologías de hueco en la misma vivienda.',
    ventanas: [v1, v2, v3],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const actuacion2: Actuacion = {
    id: generarId(),
    etiqueta: 'Local anexo – patio interior',
    estadoObra: 'en-elaboracion',
    referenciaCatastral: '9872023VH5797S0002WX',
    direccion: 'Calle Mayor 18, local',
    codigoPostal: '28013',
    municipio: 'Madrid',
    provincia: 'Madrid',
    provinciaCodigo: '28',
    ubicacion: 'peninsula',
    altitudM: 655,
    origenClima: {
      provincia: 'codigo-postal',
      altitud: 'manual',
      altitudDetalle: 'Altitud de ejemplo (tutorial).',
      zona: 'automatica',
    },
    zonaInvierno: 'D',
    zonaVerano: 3,
    edificioExistente: true,
    usoResidencialPrivado: true,
    superficieEnvolventeM2: 180,
    cliente: {
      nombre: 'María López García',
      nifNie: '12345678Z',
      telefono: '600123456',
      email: 'maria.lopez@ejemplo.es',
      direccion: 'Calle Mayor 18, 3º B, 28013 Madrid',
    },
    propietarioAhorro: 'María López García',
    duracionAnios: 20,
    fechaInicio: '2025-10-01',
    fechaFin: '',
    documentacion: documentacionVacia(),
    notas: 'Segunda actuación del mismo expediente (otra referencia catastral). Aún en elaboración.',
    ventanas: [
      {
        ...ventanaVacia(1),
        etiqueta: 'V1 – Patio',
        estancia: 'Trastero',
        planta: 'Baja',
        orientacion: 'N',
        unidades: 1,
        superficieM2: 1.0,
        anterior: { descripcion: 'Ventana metal sin RPT', transmitancia: 5.8 },
        nueva: {
          descripcion: 'PVC 4/16/4',
          transmitancia: 1.6,
          materialMarco: 'pvc',
          clasePermeabilidad: 3,
          marcadoCE: true,
          tienePersiana: false,
          claseCajonPersiana: 0,
        },
      },
    ],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  return {
    id: generarId(),
    referencia: 'CAE-TUTORIAL-2026-001',
    estado: 'en-verificacion',
    sujeto: {
      tipo: 'delegado',
      razonSocial: 'Comercializadora Ejemplo, S.A.',
      nifNie: 'A11111111',
      domicilio: 'Calle Energía 1, 28001 Madrid',
      email: 'cae@comercializadora-ejemplo.es',
      telefono: '910000333',
      representante: { nombre: 'Ana Pérez Soto', nifNie: '12345678Z' },
    },
    gestor: {
      rol: 'instalador',
      razonSocial: 'Energía Eficiencia del Centro, S.L.',
      nifNie: 'B12345678',
      telefono: '910000111',
      email: 'cae@eficiencia-ejemplo.es',
    },
    valorEconomicoEurPorMWhAnio: 120,
    feeIntermediarioEurPorMWhAnio: 18,
    validado: true,
    contratoDefinitivo: undefined,
    informeTecnico: undefined,
    contratoCompraventa: undefined,
    certificadoraNombre: '',
    certificadoraReferencia: '',
    certificadoraInfo: '',
    notas:
      'Expediente de ejemplo para aprender la app. Contiene dos actuaciones: una finalizada con documentación y otra en elaboración. El SO/SD es la comercializadora; el gestor es el intermediario/instalador. Puedes editarlo o eliminarlo.',
    actuaciones: [actuacion1, actuacion2],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}
