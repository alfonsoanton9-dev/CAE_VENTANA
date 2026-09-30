import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { calcularExpediente } from '@/domain/calculo';
import { formatoNumero } from '@/domain/formato';
import { useAlmacen } from '@/store/almacen';
import { Boton, Cargando, Insignia, Pantalla, Tarjeta, Vacio } from '@/ui/componentes';
import { etiquetaEstado, tonoEstado } from '@/ui/estado';
import { color } from '@/ui/tema';

export default function Expedientes() {
  const router = useRouter();
  const { cargado, expedientes, parametros } = useAlmacen();
  const [busqueda, setBusqueda] = useState('');

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return expedientes
      .filter((e) => !q || [e.referencia, e.referenciaCatastral, e.cliente.nombre, e.direccion, e.municipio].some((t) => t.toLowerCase().includes(q)))
      .map((e) => ({ e, r: calcularExpediente(e, parametros) }));
  }, [expedientes, parametros, busqueda]);

  if (!cargado) return <Cargando />;

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: color.borde, borderRadius: 10, paddingHorizontal: 12 }}>
          <Ionicons name="search" size={18} color={color.textoSuave} />
          <TextInput
            accessibilityLabel="Buscar expedientes"
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por referencia, cliente o dirección"
            placeholderTextColor="#9AA8B6"
            style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: color.texto }}
          />
        </View>
        <Boton titulo="Nuevo" icono="add" onPress={() => router.push('/expediente/nuevo')} />
      </View>

      {expedientes.length === 0 ? (
        <Tarjeta>
          <Vacio
            icono="business-outline"
            titulo="Aún no hay expedientes"
            texto="Crea tu primer expediente para registrar la vivienda, el cliente y las ventanas sustituidas, y calcular los CAE según la ficha RES070."
          >
            <Boton titulo="Crear expediente" icono="add" onPress={() => router.push('/expediente/nuevo')} />
          </Vacio>
        </Tarjeta>
      ) : filas.length === 0 ? (
        <Tarjeta>
          <Vacio icono="search-outline" titulo="Sin resultados" texto={`Ningún expediente coincide con “${busqueda}”.`} />
        </Tarjeta>
      ) : (
        filas.map(({ e, r }) => (
          <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`Abrir expediente ${e.referencia}`} onPress={() => router.push(`/expediente/${e.id}`)}>
            {({ pressed }) => (
              <Tarjeta style={pressed ? { opacity: 0.85 } : undefined}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: color.texto }}>{e.referencia || 'Sin referencia'}</Text>
                    <Text style={{ color: color.textoSuave, fontSize: 13.5 }} numberOfLines={2}>
                      {[e.cliente.nombre, e.direccion, e.municipio].filter(Boolean).join(' · ') || 'Sin datos de cliente ni dirección'}
                    </Text>
                    {e.referenciaCatastral ? <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>Ref. catastral {e.referenciaCatastral}</Text> : null}
                  </View>
                  <Insignia texto={etiquetaEstado(e.estado)} tono={tonoEstado(e.estado)} />
                </View>
                <View style={{ flexDirection: 'row', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
                  <Dato titulo="Ventanas" valor={String(e.ventanas.length)} />
                  <Dato titulo="Zona" valor={e.zonaInvierno && e.zonaVerano ? `${e.zonaInvierno}${e.zonaVerano}` : '—'} />
                  <Dato titulo="Ahorro (kWh/año)" valor={formatoNumero(r.aeTotal)} />
                  <Dato titulo="CAE" valor={formatoNumero(r.cae)} destacado />
                </View>
                {!r.cumple && e.ventanas.length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Insignia texto="Requisitos por revisar" tono="aviso" />
                  </View>
                ) : null}
              </Tarjeta>
            )}
          </Pressable>
        ))
      )}
    </Pantalla>
  );
}

function Dato({ titulo, valor, destacado }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <View>
      <Text style={{ fontSize: 11.5, color: color.textoSuave, textTransform: 'uppercase', letterSpacing: 0.4 }}>{titulo}</Text>
      <Text style={{ fontSize: destacado ? 20 : 16, fontWeight: '700', color: destacado ? color.primario : color.texto }}>{valor}</Text>
    </View>
  );
}
