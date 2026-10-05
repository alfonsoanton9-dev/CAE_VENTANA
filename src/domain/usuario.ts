import { esIntermediarioInstalador, normalizarRolUsuario, type UsuarioPerfil } from './tipos';

export function perfilUsuarioVacio(): UsuarioPerfil {
  return {
    nombre: '',
    nifNie: '',
    telefono: '',
    email: '',
    direccion: '',
    cargoFirma: 'representante-legal',
    cargoFirmaOtro: '',
    sociedad: '',
    nifSociedad: '',
    domicilioSociedad: '',
    rol: 'intermediario-instalador',
    feePactadoEurPorMWhAnio: undefined,
    contratoColaboracion: undefined,
    contratoGeneradoAceptado: false,
    actualizadoEn: new Date().toISOString(),
  };
}

export function perfilUsuarioTutorial(): UsuarioPerfil {
  return {
    nombre: 'Carlos Ruiz Méndez',
    nifNie: '87654321X',
    telefono: '910000111',
    email: 'carlos.ruiz@eficiencia-ejemplo.es',
    direccion: 'Paseo de la Castellana 100, 28046 Madrid',
    cargoFirma: 'representante-legal',
    cargoFirmaOtro: '',
    sociedad: 'Energía Eficiencia del Centro, S.L.',
    nifSociedad: 'B12345678',
    domicilioSociedad: 'Paseo de la Castellana 100, 28046 Madrid',
    rol: 'intermediario-instalador',
    feePactadoEurPorMWhAnio: 18,
    contratoColaboracion: undefined,
    contratoGeneradoAceptado: false,
    actualizadoEn: new Date().toISOString(),
  };
}

export function normalizarPerfilUsuario(raw: unknown): UsuarioPerfil {
  const base = perfilUsuarioVacio();
  if (!raw || typeof raw !== 'object') return base;
  const u = raw as Partial<UsuarioPerfil> & {
    contraparteRazonSocial?: string;
    contraparteNif?: string;
    contraparteDomicilio?: string;
    feePactadoPct?: number;
    rol?: string;
  };
  const {
    contraparteRazonSocial: _c1,
    contraparteNif: _c2,
    contraparteDomicilio: _c3,
    feePactadoPct: _feePct,
    ...resto
  } = u;
  return {
    ...base,
    ...resto,
    cargoFirma: u.cargoFirma ?? base.cargoFirma,
    rol: normalizarRolUsuario(u.rol),
    feePactadoEurPorMWhAnio:
      typeof u.feePactadoEurPorMWhAnio === 'number' ? u.feePactadoEurPorMWhAnio : undefined,
    contratoGeneradoAceptado: typeof u.contratoGeneradoAceptado === 'boolean' ? u.contratoGeneradoAceptado : false,
    actualizadoEn: u.actualizadoEn ?? new Date().toISOString(),
  };
}

function etiquetaCargo(u: UsuarioPerfil): string {
  if (u.cargoFirma === 'otro') return u.cargoFirmaOtro.trim() || 'cargo con facultad de firma';
  const mapa: Record<UsuarioPerfil['cargoFirma'], string> = {
    'representante-legal': 'representante legal',
    apoderado: 'apoderado',
    administrador: 'administrador',
    director: 'director / gerente',
    otro: 'cargo con facultad de firma',
  };
  return mapa[u.cargoFirma];
}

function etiquetaRol(rol: UsuarioPerfil['rol']): string {
  if (rol === 'propietario-inicial') return 'propietario inicial del ahorro de energía final';
  return 'intermediario / instalador';
}

/**
 * Contrato marco de colaboración (intermediario/instalador).
 * El fee (€/MWh·año) se precarga del perfil; el SO/SD concreto se formaliza en cada expediente.
 */
export function textoContratoColaboracion(u: UsuarioPerfil): string {
  const fee =
    u.feePactadoEurPorMWhAnio === undefined
      ? '[fee pactado pendiente]'
      : `${String(u.feePactadoEurPorMWhAnio).replace('.', ',')} €/MWh·año`;
  const fecha = new Date().toLocaleDateString('es-ES');
  return [
    'CONTRATO MARCO DE COLABORACIÓN PARA LA GESTIÓN DE CERTIFICADOS DE AHORRO ENERGÉTICO (CAE)',
    '',
    `Fecha de generación: ${fecha}`,
    '',
    'REUNIDOS',
    '',
    `De una parte, el sujeto obligado o delegado que se designará en cada expediente CAE gestionado al amparo de este contrato (en adelante, el “Sujeto obligado/delegado”).`,
    '',
    `De otra parte, ${u.sociedad || '[sociedad del usuario]'}, con NIF/CIF ${u.nifSociedad || '[NIF sociedad]'}, y domicilio en ${u.domicilioSociedad || '[domicilio sociedad]'}, representada por ${u.nombre || '[nombre]'} (${u.nifNie || '[NIF]'}), en calidad de ${etiquetaCargo(u)} con facultad de firma (en adelante, el “Colaborador”, en su condición de ${etiquetaRol(u.rol)}).`,
    '',
    'MANIFIESTAN',
    '',
    'I. Que ambas partes tienen interés en colaborar en la identificación, documentación, verificación y monetización de ahorros energéticos derivados de la sustitución de ventanas conforme a la ficha RES070.',
    'II. Que el Colaborador aportará la gestión documental y operativa necesaria para la emisión de CAE, identificando en cada expediente al propietario inicial del ahorro.',
    'III. Que los datos del Sujeto obligado/delegado (razón social, NIF/CIF y domicilio) se consignarán en cada expediente concreto.',
    '',
    'CLÁUSULAS',
    '',
    '1. Objeto. El presente contrato regula la colaboración entre las partes para la gestión de expedientes CAE asociados a actuaciones de renovación de ventanas.',
    `2. Fee pactado. El Colaborador percibirá un fee de ${fee} por cada MWh/año de ahorro aportado a la plataforma mediante expedientes de sus clientes. El retorno del Colaborador es MWh/año × fee €/MWh·año.`,
    '3. Obligaciones del Colaborador. Recopilar documentación del apartado 5 de la ficha, mantener trazabilidad de actuaciones y ventanas, identificar al propietario inicial del CAE en cada expediente y facilitar la verificación.',
    '4. Obligaciones del Sujeto obligado/delegado. Facilitar la información contractual necesaria y abonar el fee pactado conforme a los expedientes verificados y, en su caso, vendidos.',
    '5. Protección de datos. Las partes cumplirán la normativa aplicable en materia de protección de datos personales.',
    '6. Firma. El presente contrato podrá firmarse electrónicamente en la aplicación CAE Ventanas. La aceptación en la app equivale a la firma del representante con facultad de firma.',
    '',
    'Y en prueba de conformidad, las partes firman el presente contrato.',
    '',
    `Colaborador: ${u.nombre || '______________'}  ·  NIF ${u.nifNie || '________'}`,
    `Sociedad: ${u.sociedad || '______________'}  ·  NIF ${u.nifSociedad || '________'}`,
    `Fee pactado: ${fee}`,
    'Sujeto obligado/delegado: el consignado en cada expediente',
  ].join('\n');
}

export { esIntermediarioInstalador };
