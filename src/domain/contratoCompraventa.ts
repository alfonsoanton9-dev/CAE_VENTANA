import { generarId } from './fabrica';
import { formatoNumero } from './formato';
import type { Adjunto, Expediente, UsuarioPerfil } from './tipos';

function propietarioExpediente(e: Expediente): { nombre: string; nif: string } {
  const a = e.actuaciones.find((x) => x.propietarioAhorro.trim() || x.cliente.nombre.trim()) ?? e.actuaciones[0];
  if (!a) return { nombre: '[propietario inicial pendiente]', nif: '[NIF pendiente]' };
  return {
    nombre: a.propietarioAhorro.trim() || a.cliente.nombre.trim() || '[propietario inicial pendiente]',
    nif: a.cliente.nifNie.trim() || '[NIF pendiente]',
  };
}

/** Cuerpo del contrato de compraventa CAE con campos del expediente/usuario precargados. */
export function textoContratoCompraventa(e: Expediente, usuario: UsuarioPerfil, energiaMWhAnio?: number): string {
  const prop = propietarioExpediente(e);
  const precio =
    e.valorEconomicoEurPorMWhAnio === undefined
      ? '[PRECIO AHORRO CAE pendiente]'
      : `${formatoNumero(e.valorEconomicoEurPorMWhAnio)} €/MWh·año`;
  const mwh = energiaMWhAnio === undefined ? '[MWh/año pendiente]' : `${formatoNumero(energiaMWhAnio, 3)} MWh/año`;
  const importe =
    e.valorEconomicoEurPorMWhAnio !== undefined && energiaMWhAnio !== undefined
      ? `${formatoNumero(energiaMWhAnio * e.valorEconomicoEurPorMWhAnio)} €`
      : '[importe pendiente]';
  const intermediario = usuario.sociedad.trim() || usuario.nombre.trim() || e.gestor.razonSocial || '[intermediario/instalador]';
  const nifInter = usuario.nifSociedad.trim() || usuario.nifNie.trim() || e.gestor.nifNie || '[NIF intermediario]';
  const fecha = new Date().toLocaleDateString('es-ES');

  return [
    'CONTRATO DE COMPRAVENTA DE CERTIFICADOS DE AHORRO ENERGÉTICO (CAE)',
    '',
    `Expediente: ${e.referencia || '[sin referencia]'}`,
    `Fecha: ${fecha}`,
    '',
    'REUNIDOS',
    '',
    `De una parte, ${prop.nombre}, con NIF/NIE ${prop.nif} (en adelante, el “Propietario inicial” del ahorro de energía final).`,
    '',
    `De otra parte, ${e.sujeto.razonSocial || '[sujeto obligado/delegado]'}, con NIF/CIF ${e.sujeto.nifNie || '[NIF]'}, y domicilio en ${e.sujeto.domicilio || '[domicilio]'}, en su condición de ${e.sujeto.tipo === 'obligado' ? 'sujeto obligado' : 'sujeto delegado'} (en adelante, el “Comprador”).`,
    '',
    `Interviene asimismo ${intermediario}, con NIF/CIF ${nifInter}, en calidad de intermediario/instalador gestor de la documentación CAE del expediente (en adelante, el “Intermediario”).`,
    '',
    'MANIFIESTAN',
    '',
    'I. Que el Propietario inicial es titular del ahorro energético derivado de la sustitución de ventanas conforme a la ficha RES070.',
    `II. Que el ahorro del expediente se estima en ${mwh}.`,
    `III. Que el PRECIO AHORRO CAE pactado es de ${precio}, resultando un importe estimado de ${importe}.`,
    '',
    'CLÁUSULAS',
    '',
    '1. Objeto. El Propietario inicial cede/vende al Comprador los CAE derivados del ahorro de energía final del expediente indicado.',
    `2. Precio. El Comprador abonará al Propietario inicial el PRECIO AHORRO CAE de ${precio} por cada MWh/año de ahorro verificado.`,
    '3. Documentación. Las partes facilitarán la documentación del apartado 5 de la ficha RES070 y la verificación ante la certificadora correspondiente.',
    '4. Intermediario. El Intermediario gestiona la documentación y trazabilidad del expediente conforme a su contrato de colaboración.',
    '5. Firma. El presente contrato puede firmarse electrónicamente en la aplicación CAE Ventanas. La firma en pantalla equivale a la firma manuscrita del representante con facultad de firma.',
    '',
    'Y en prueba de conformidad, las partes firman el presente contrato.',
    '',
    `Propietario inicial: ${prop.nombre}  ·  NIF ${prop.nif}`,
    `Comprador (SO/SD): ${e.sujeto.razonSocial || '______________'}  ·  NIF ${e.sujeto.nifNie || '________'}`,
    `Intermediario: ${intermediario}  ·  NIF ${nifInter}`,
    `PRECIO AHORRO CAE: ${precio}`,
  ].join('\n');
}

function escaparPdf(t: string): string {
  const ascii = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** PDF mínimo (texto) firmado, sin dependencias externas. */
export function generarPdfTextoFirmado(texto: string, firmadoPor: string, nombreArchivo: string): Adjunto {
  const lineas = texto.split('\n');
  lineas.push('', `Firmado electrónicamente por: ${firmadoPor}`, `Fecha/hora: ${new Date().toLocaleString('es-ES')}`);

  const contenido: string[] = ['BT', '/F1 10 Tf', '50 780 Td', '12 TL'];
  for (const linea of lineas) {
    contenido.push(`(${escaparPdf(linea.slice(0, 95))}) Tj`, 'T*');
  }
  contenido.push('ET');
  const stream = contenido.join('\n');

  const objs: string[] = [];
  objs.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');
  objs.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n');
  objs.push('3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n');
  objs.push(`4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`);
  objs.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n');

  let pdf = '%PDF-1.4\n';
  const offs: number[] = [0];
  for (const o of objs) {
    offs.push(pdf.length);
    pdf += o;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objs.length; i++) {
    pdf += `${String(offs[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const base64 = btoa(pdf);
  return {
    id: generarId(),
    nombre: nombreArchivo,
    mime: 'application/pdf',
    tamanoBytes: pdf.length,
    contenidoBase64: base64,
    subidoEn: new Date().toISOString(),
  };
}

/** PDF mínimo (texto) del contrato firmado, sin dependencias externas. */
export function generarPdfContratoFirmado(texto: string, firmadoPor: string): Adjunto {
  return generarPdfTextoFirmado(
    texto,
    firmadoPor,
    `contrato-compraventa-firmado-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}

export function descargarAdjunto(a: Adjunto) {
  if (typeof document === 'undefined') return;
  const bin = atob(a.contenidoBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: a.mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = a.nombre;
  link.click();
  URL.revokeObjectURL(url);
}
