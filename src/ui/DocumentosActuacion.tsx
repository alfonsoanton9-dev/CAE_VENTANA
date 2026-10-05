import { Ionicons } from '@expo/vector-icons';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { elegirAdjunto, formatoTamanoAdjunto, uriAdjunto } from '@/domain/adjuntos';
import { TIPOS_DOCUMENTO, type Adjunto, type ClaveDocumento, type DocumentacionActuacion } from '@/domain/tipos';
import { Boton, Nota, Seccion } from './componentes';
import { color } from './tema';

export function DocumentosActuacion({
  documentacion,
  onChange,
}: {
  documentacion: DocumentacionActuacion;
  onChange: (docs: DocumentacionActuacion) => void;
}) {
  const hechos = TIPOS_DOCUMENTO.filter((t) => (documentacion[t.clave] ?? []).length > 0).length;

  const anadir = async (clave: ClaveDocumento) => {
    const r = await elegirAdjunto();
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
              archivos.map((a) => <FilaAdjunto key={a.id} a={a} onEliminar={() => eliminar(tipo.clave, a.id)} />)
            )}
          </View>
        );
      })}
    </Seccion>
  );
}

export function CampoFoto({
  etiqueta,
  ayuda,
  valor,
  onChange,
  soloImagenes = true,
}: {
  etiqueta: string;
  ayuda?: string;
  valor?: Adjunto;
  onChange: (a: Adjunto | undefined) => void;
  /** Si es false, admite también PDF u otros documentos. */
  soloImagenes?: boolean;
}) {
  const subir = async () => {
    const r = await elegirAdjunto({ soloImagenes });
    if (!r) return;
    if ('error' in r) {
      alert(r.error);
      return;
    }
    onChange(r);
  };
  const uri = valor ? uriAdjunto(valor) : undefined;

  return (
    <View style={{ gap: 8, flex: 1, minWidth: 160 }}>
      <Text style={{ fontWeight: '600', color: color.texto, fontSize: 14 }}>{etiqueta}</Text>
      {ayuda ? <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>{ayuda}</Text> : null}
      {uri && (valor?.mime.startsWith('image/') ?? false) ? (
        <Image source={{ uri }} style={{ width: '100%', height: 140, borderRadius: 10, backgroundColor: color.fondo }} resizeMode="cover" />
      ) : valor ? (
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: color.fondo }}>
          <Text style={{ color: color.texto }}>{valor.nombre}</Text>
          <Text style={{ color: color.textoSuave, fontSize: 12 }}>{formatoTamanoAdjunto(valor.tamanoBytes)}</Text>
        </View>
      ) : (
        <View style={{ height: 100, borderRadius: 10, borderWidth: 1, borderColor: color.borde, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={soloImagenes ? 'image-outline' : 'document-outline'} size={28} color={color.textoSuave} />
          <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>{soloImagenes ? 'Sin foto' : 'Sin archivo'}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Boton titulo={valor ? 'Cambiar' : soloImagenes ? 'Subir foto' : 'Subir archivo'} variante="secundario" icono={soloImagenes ? 'camera-outline' : 'cloud-upload-outline'} onPress={() => void subir()} flex />
        {valor ? <Boton titulo="Quitar" variante="peligro" onPress={() => onChange(undefined)} /> : null}
      </View>
    </View>
  );
}

function FilaAdjunto({ a, onEliminar }: { a: Adjunto; onEliminar: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.fondo, borderRadius: 8, padding: 8 }}>
      <Ionicons name={a.mime.startsWith('image/') ? 'image-outline' : 'document-outline'} size={18} color={color.primario} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: color.texto, fontSize: 13.5 }} numberOfLines={1}>
          {a.nombre}
        </Text>
        <Text style={{ color: color.textoSuave, fontSize: 11.5 }}>{formatoTamanoAdjunto(a.tamanoBytes)}</Text>
      </View>
      <Pressable accessibilityLabel={`Eliminar ${a.nombre}`} onPress={onEliminar} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={color.error} />
      </Pressable>
    </View>
  );
}
