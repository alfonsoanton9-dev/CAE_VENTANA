import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text, View } from 'react-native';
import { generarId } from '@/domain/fabrica';
import { TIPOS_DOCUMENTO, type Adjunto, type ClaveDocumento, type DocumentacionActuacion } from '@/domain/tipos';
import { Boton, Nota, Seccion } from './componentes';
import { color } from './tema';

const TAMANO_MAX_BYTES = 1_500_000;

function formatoTamano(n: number): string {
  if (n <= 0) return 'marcador';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function leerArchivoComoAdjunto(): Promise<Adjunto | { error: string } | undefined> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return { error: 'La subida de archivos está disponible en la versión web. En móvil podrás marcar los documentos más adelante.' };
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*';
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

export function DocumentosActuacion({
  documentacion,
  onChange,
}: {
  documentacion: DocumentacionActuacion;
  onChange: (docs: DocumentacionActuacion) => void;
}) {
  const hechos = TIPOS_DOCUMENTO.filter((t) => (documentacion[t.clave] ?? []).length > 0).length;

  const anadir = async (clave: ClaveDocumento) => {
    const r = await leerArchivoComoAdjunto();
    if (!r) return;
    if ('error' in r) {
      alert(r.error);
      return;
    }
    onChange({ ...documentacion, [clave]: [...(documentacion[clave] ?? []), r] });
  };

  const eliminar = (clave: ClaveDocumento, id: string) => {
    onChange({ ...documentacion, [clave]: (documentacion[clave] ?? []).filter((a) => a.id !== id) });
  };

  return (
    <Seccion
      titulo={`Documentación justificativa (${hechos}/${TIPOS_DOCUMENTO.length})`}
      ayuda="Apartado 5 de la ficha RES070: documentación para justificar los ahorros de la actuación y su realización."
    >
      {Platform.OS !== 'web' ? (
        <Nota tono="aviso" texto="La subida de archivos funciona en la versión web. Aquí puedes revisar los adjuntos ya guardados." />
      ) : (
        <Nota tono="ok" texto="Puedes adjuntar PDF o imágenes (máx. 1,5 MB por archivo). Se guardan en este dispositivo." />
      )}
      {TIPOS_DOCUMENTO.map((tipo) => {
        const archivos = documentacion[tipo.clave] ?? [];
        return (
          <View key={tipo.clave} style={{ borderWidth: 1, borderColor: color.borde, borderRadius: 10, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '700', color: color.texto, fontSize: 14.5 }}>{tipo.etiqueta}</Text>
                <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>{tipo.ayuda}</Text>
              </View>
              <Boton titulo="Subir" icono="cloud-upload-outline" variante="secundario" onPress={() => void anadir(tipo.clave)} />
            </View>
            {archivos.length === 0 ? (
              <Text style={{ color: color.textoSuave, fontSize: 13 }}>Sin archivos adjuntos.</Text>
            ) : (
              archivos.map((a) => (
                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.fondo, borderRadius: 8, padding: 8 }}>
                  <Ionicons name={a.mime.startsWith('image/') ? 'image-outline' : 'document-outline'} size={18} color={color.primario} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: color.texto, fontSize: 13.5 }} numberOfLines={1}>
                      {a.nombre}
                    </Text>
                    <Text style={{ color: color.textoSuave, fontSize: 11.5 }}>{formatoTamano(a.tamanoBytes)}</Text>
                  </View>
                  <Pressable accessibilityLabel={`Eliminar ${a.nombre}`} onPress={() => eliminar(tipo.clave, a.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={color.error} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        );
      })}
    </Seccion>
  );
}
