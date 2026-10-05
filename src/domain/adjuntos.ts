import { generarId } from '@/domain/fabrica';
import type { Adjunto, EstadoExpediente } from '@/domain/tipos';
import { Platform } from 'react-native';

const TAMANO_MAX_BYTES = 1_500_000;

export function formatoTamanoAdjunto(n: number): string {
  if (n <= 0) return 'marcador';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Flujo de estados del expediente (indicador; avance por acciones). */
export const FLUJO_ESTADO_EXPEDIENTE: ReadonlyArray<{
  valor: EstadoExpediente;
  etiqueta: string;
  accionSiguiente?: string;
}> = [
  { valor: 'borrador', etiqueta: 'Borrador', accionSiguiente: 'Enviar a verificación' },
  { valor: 'en-verificacion', etiqueta: 'En verificación', accionSiguiente: 'Marcar como verificado' },
  { valor: 'verificado', etiqueta: 'Verificado', accionSiguiente: 'Marcar como cerrado y cobrado' },
  { valor: 'vendido-cobrado', etiqueta: 'Cerrado y cobrado' },
];

export function siguienteEstadoExpediente(actual: EstadoExpediente): EstadoExpediente | undefined {
  const i = FLUJO_ESTADO_EXPEDIENTE.findIndex((x) => x.valor === actual);
  return i >= 0 ? FLUJO_ESTADO_EXPEDIENTE[i + 1]?.valor : undefined;
}

export function accionAvanceEstado(actual: EstadoExpediente): string | undefined {
  return FLUJO_ESTADO_EXPEDIENTE.find((x) => x.valor === actual)?.accionSiguiente;
}

/** Texto de ayuda / confirmación al avanzar el estado del expediente. */
export function mensajeAvanceEstado(actual: EstadoExpediente): string | undefined {
  if (actual === 'borrador')
    return 'Se consolidará la documentación necesaria y el expediente se enviará a verificación para la certificación del CAE.';
  if (actual === 'en-verificacion')
    return 'Para cerrar la verificación debes aportar el contrato definitivo y el informe técnico.';
  if (actual === 'verificado') return 'El expediente se marcará como cerrado y cobrado con la información aportada.';
  return undefined;
}

export async function elegirAdjunto(opciones?: { soloImagenes?: boolean }): Promise<Adjunto | { error: string } | undefined> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return { error: 'La subida de archivos está disponible en la versión web.' };
  }
  const accept = opciones?.soloImagenes ? 'image/*,.png,.jpg,.jpeg,.webp' : '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*';
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      if (file.size > TAMANO_MAX_BYTES) {
        resolve({ error: `El archivo supera el máximo de ${(TAMANO_MAX_BYTES / 1024 / 1024).toFixed(1)} MB.` });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? '');
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve({
          id: generarId(),
          nombre: file.name,
          mime: file.type || 'application/octet-stream',
          tamanoBytes: file.size,
          contenidoBase64: base64,
          subidoEn: new Date().toISOString(),
        });
      };
      reader.onerror = () => resolve({ error: 'No se pudo leer el archivo.' });
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export function uriAdjunto(a: Adjunto): string | undefined {
  if (!a.contenidoBase64) return undefined;
  const mime = a.mime || 'application/octet-stream';
  return `data:${mime};base64,${a.contenidoBase64}`;
}
