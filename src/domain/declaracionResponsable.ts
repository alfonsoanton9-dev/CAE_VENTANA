import type { Actuacion, DatosDeclaracionResponsable } from './tipos';

export function datosDeclaracionResponsableVacios(): DatosDeclaracionResponsable {
  return {
    comunidadAutonoma: '',
    numerosSerie: '',
    beneficiarioDistinto: false,
    beneficiarioNombre: '',
    beneficiarioNif: '',
    beneficiarioDomicilio: '',
    beneficiarioTelefono: '',
    beneficiarioEmail: '',
    tieneRepresentante: false,
    representanteNombre: '',
    representanteNif: '',
    representanteDomicilio: '',
    representanteTelefono: '',
    representanteEmail: '',
    poderTipo: '',
    poderDetalle: '',
    bonoSocial: 'ninguno',
    situacionAyuda: 'no-solicitado',
    ayudaDenominacion: '',
    ayudaEntidad: '',
    ayudaAnio: '',
    ayudaDisposicion: '',
    ayudaNumeroExpediente: '',
    ayudaEstado: '',
    ayudaFechaSolicitud: '',
    ayudaFechaResolucion: '',
    ayudaCuantia: '',
    lugarFirma: '',
  };
}

export function normalizarDatosDeclaracionResponsable(
  d?: Partial<DatosDeclaracionResponsable> | null,
): DatosDeclaracionResponsable {
  const base = datosDeclaracionResponsableVacios();
  if (!d) return base;
  return {
    ...base,
    ...d,
    beneficiarioDistinto: Boolean(d.beneficiarioDistinto),
    tieneRepresentante: Boolean(d.tieneRepresentante),
    bonoSocial: d.bonoSocial ?? 'ninguno',
    situacionAyuda: d.situacionAyuda ?? 'no-solicitado',
    poderTipo: d.poderTipo === 'notarial' || d.poderTipo === 'otro' ? d.poderTipo : '',
  };
}

function marca(activo: boolean): string {
  return activo ? '[X]' : '[ ]';
}

function etiquetaBono(b: DatosDeclaracionResponsable['bonoSocial']): string {
  switch (b) {
    case 'electrico-vulnerable':
      return 'Bono social eléctrico para consumidores vulnerables';
    case 'electrico-vulnerable-severo':
      return 'Bono social eléctrico para consumidores vulnerables severos';
    case 'electrico-exclusion':
      return 'Bono social eléctrico en riesgo de exclusión social';
    case 'justicia-energetica':
      return 'Bono social de justicia energética';
    case 'termico':
      return 'Bono social térmico';
    default:
      return 'Ninguno de los anteriores';
  }
}

/**
 * Cuerpo del Anexo I (declaración responsable) precargado con datos de la actuación.
 * El propietario inicial debe firmarlo por cada actuación.
 */
export function textoDeclaracionResponsable(a: Actuacion, datos?: DatosDeclaracionResponsable): string {
  const d = datos ?? a.declaracionResponsableDatos ?? datosDeclaracionResponsableVacios();
  const propNombre = a.propietarioAhorro.trim() || a.cliente.nombre.trim() || '[propietario inicial pendiente]';
  const propNif = a.cliente.nifNie.trim() || '[NIF pendiente]';
  const domicilio = [a.cliente.direccion, a.codigoPostal, a.municipio, a.provincia].filter(Boolean).join(', ') || '[domicilio pendiente]';
  const direccionAct = [a.direccion, a.codigoPostal, a.municipio, a.provincia].filter(Boolean).join(', ') || '[dirección pendiente]';
  const comunidad = d.comunidadAutonoma.trim() || a.provincia.trim() || '[comunidad autónoma pendiente]';
  const series =
    d.numerosSerie.trim() ||
    a.ventanas
      .map((v) => {
        const sn = v.nueva?.numeroSerie?.trim();
        const modelo = v.nueva?.modelo?.trim();
        if (sn && modelo) return `${modelo} (${sn})`;
        return sn || modelo || v.codigoInstalador.trim();
      })
      .filter(Boolean)
      .join('; ') ||
    '—';
  const lugar = d.lugarFirma.trim() || a.municipio.trim() || '_______________';
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = fecha.toLocaleDateString('es-ES', { month: 'long' });
  const anio = String(fecha.getFullYear());

  const lineas: string[] = [
    'ANEXO I',
    'DECLARACIÓN RESPONSABLE FORMALIZADA POR EL PROPIETARIO INICIAL DEL AHORRO',
    'REFERIDA A LA SOLICITUD Y/U OBTENCIÓN DE AYUDAS O SUBVENCIONES PÚBLICAS',
    'PARA LA MISMA ACTUACIÓN DE AHORRO DE ENERGÍA',
    '',
    '1. Identificación de la actuación de ahorro de energía',
    `Nombre de la actuación: ${a.etiqueta || '[sin etiqueta]'}`,
    'Código y nombre de la ficha: RES070 — Sustitución de ventanas y/o lucernarios',
    `Comunidad autónoma en la que se ejecutó la actuación: ${comunidad}`,
    `Dirección postal de la instalación: ${direccionAct}`,
    `Referencia catastral: ${a.referenciaCatastral.trim() || '[pendiente]'}`,
    `En su caso, número de serie de los equipos: ${series}`,
    '',
    '2. Identificación del propietario inicial del ahorro y del beneficiario',
    `Propietario inicial del ahorro: ${propNombre}`,
    `NIF/NIE: ${propNif}`,
    `Domicilio: ${domicilio}`,
    `Teléfono: ${a.cliente.telefono.trim() || '—'}`,
    `Correo electrónico: ${a.cliente.email.trim() || '—'}`,
    '',
  ];

  if (d.beneficiarioDistinto) {
    lineas.push(
      'Beneficiario del ahorro (distinto del propietario inicial):',
      `Nombre / razón social: ${d.beneficiarioNombre || '[pendiente]'}`,
      `NIF/NIE: ${d.beneficiarioNif || '[pendiente]'}`,
      `Domicilio: ${d.beneficiarioDomicilio || '—'}`,
      `Teléfono: ${d.beneficiarioTelefono || '—'}`,
      `Correo electrónico: ${d.beneficiarioEmail || '—'}`,
      '',
    );
  } else {
    lineas.push('El propietario inicial del ahorro coincide con el beneficiario del ahorro.', '');
  }

  lineas.push('3. Identificación del representante del propietario inicial del ahorro (si procede)');
  if (d.tieneRepresentante) {
    lineas.push(
      `Representante: ${d.representanteNombre || '[pendiente]'}`,
      `NIF/NIE: ${d.representanteNif || '[pendiente]'}`,
      `Domicilio: ${d.representanteDomicilio || '—'}`,
      `Teléfono: ${d.representanteTelefono || '—'}`,
      `Correo electrónico: ${d.representanteEmail || '—'}`,
      `Ostentando poderes suficientes según: ${
        d.poderTipo === 'notarial'
          ? `Poder notarial (${d.poderDetalle || 'fecha y protocolo pendientes'}). Se adjunta copia.`
          : d.poderTipo === 'otro'
            ? `Otro documento: ${d.poderDetalle || '[identificar título y fecha]'}. Se adjunta copia.`
            : '[indicar poder notarial u otro documento]'
      }`,
      'Manifestando que dichos poderes no se encuentran revocados, modificados ni limitados.',
      '',
    );
  } else {
    lineas.push('No actúa mediante representante.', '');
  }

  lineas.push(
    '4. Indicación de si el propietario inicial del ahorro o el beneficiario son perceptores del bono social',
    `${marca(d.bonoSocial === 'electrico-vulnerable')} Bono social eléctrico para consumidores vulnerables`,
    `${marca(d.bonoSocial === 'electrico-vulnerable-severo')} Bono social eléctrico para consumidores vulnerables severos`,
    `${marca(d.bonoSocial === 'electrico-exclusion')} Bono social eléctrico en riesgo de exclusión social`,
    `${marca(d.bonoSocial === 'justicia-energetica')} Bono social de justicia energética`,
    `${marca(d.bonoSocial === 'termico')} Bono social térmico`,
    `${marca(d.bonoSocial === 'ninguno')} Ninguno de los anteriores`,
    `Seleccionado: ${etiquetaBono(d.bonoSocial)}`,
    '',
    'En relación con la actuación arriba indicada, el abajo firmante:',
    'DECLARA RESPONSABLEMENTE',
    '',
    `${marca(d.situacionAyuda === 'no-solicitado')} NO SE HA SOLICITADO a otros organismos o administraciones internacionales, nacionales, autonómicas o locales, una ayuda o subvención para la misma actuación.`,
    `${marca(d.situacionAyuda !== 'no-solicitado')} SE HA SOLICITADO a otros organismos o administraciones una ayuda o subvención para la misma actuación, y en ese caso:`,
    `   ${marca(d.situacionAyuda === 'solicitado-obtenido')} Se ha obtenido dicha ayuda o subvención.`,
    `   ${marca(d.situacionAyuda === 'solicitado-no-obtenido')} No se ha obtenido dicha ayuda o subvención.`,
    `   ${marca(d.situacionAyuda === 'solicitado-pendiente')} Está pendiente de resolución.`,
    '',
  );

  if (d.situacionAyuda !== 'no-solicitado') {
    lineas.push(
      'Datos de la ayuda o subvención:',
      `Denominación del programa: ${d.ayudaDenominacion || '—'}`,
      `Entidad u órgano gestor: ${d.ayudaEntidad || '—'}`,
      `Año: ${d.ayudaAnio || '—'}`,
      `Disposición reguladora: ${d.ayudaDisposicion || '—'}`,
      `Número de expediente: ${d.ayudaNumeroExpediente || '—'}`,
      `Estado de la concesión: ${d.ayudaEstado || '—'}`,
      `Fecha de solicitud: ${d.ayudaFechaSolicitud || '—'}`,
      `Fecha de la resolución de concesión: ${d.ayudaFechaResolucion || '—'}`,
      `Cuantía de la ayuda obtenida o esperada: ${d.ayudaCuantia || '—'}`,
      '',
    );
  }

  lineas.push(
    'Asimismo, se COMPROMETE a comunicar cualquier modificación o variación de las circunstancias anteriores en un plazo máximo de cinco días al sujeto obligado o sujeto delegado con el que haya formalizado el convenio CAE.',
    '',
    `Y para que así conste, firma la presente en ${lugar}, a ${dia} de ${mes} de ${anio}.`,
    '',
    `Fdo.: ${propNombre}`,
    '(Firma del propietario inicial del ahorro o representante del mismo).',
  );

  return lineas.join('\n');
}
