import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { Aviso } from '@/domain/calculo';
import { fechaAIso, isoAFecha, numeroATexto, parsearNumero } from '@/domain/formato';
import { anchoMaximo, color, radio } from './tema';

export function Pantalla({ children, pie }: { children: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={e.contenido} keyboardShouldPersistTaps="handled">
        <View style={e.columna}>{children}</View>
      </ScrollView>
      {pie ? (
        <View style={e.pie}>
          <View style={[e.columna, { flexDirection: 'row', gap: 10 }]}>{pie}</View>
        </View>
      ) : null}
    </View>
  );
}

export function Cargando() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fondo }}>
      <ActivityIndicator size="large" color={color.primario} />
    </View>
  );
}

export function Tarjeta({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[e.tarjeta, style]}>{children}</View>;
}

export function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <Tarjeta>
      <Text style={e.seccionTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {ayuda ? <Text style={e.ayuda}>{ayuda}</Text> : null}
      <View style={{ gap: 14, marginTop: 12 }}>{children}</View>
    </Tarjeta>
  );
}

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'texto';

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  icono,
  deshabilitado,
  style,
  flex,
}: {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBoton;
  icono?: keyof typeof Ionicons.glyphMap;
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
}) {
  const estilos: Record<VarianteBoton, { fondo: string; texto: string; borde: string }> = {
    primario: { fondo: color.primario, texto: '#fff', borde: color.primario },
    secundario: { fondo: color.superficie, texto: color.primario, borde: color.primario },
    peligro: { fondo: color.superficie, texto: color.error, borde: color.error },
    texto: { fondo: 'transparent', texto: color.primario, borde: 'transparent' },
  };
  const s = estilos[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        e.boton,
        { backgroundColor: s.fondo, borderColor: s.borde, opacity: deshabilitado ? 0.5 : pressed ? 0.8 : 1 },
        flex && { flex: 1 },
        style,
      ]}
    >
      {icono ? <Ionicons name={icono} size={18} color={s.texto} /> : null}
      <Text style={[e.botonTexto, { color: s.texto }]}>{titulo}</Text>
    </Pressable>
  );
}

export function BotonIcono({
  icono,
  onPress,
  etiqueta,
  peligro,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  etiqueta: string;
  peligro?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [e.botonIcono, pressed && { backgroundColor: color.primarioSuave }]}
    >
      <Ionicons name={icono} size={20} color={peligro ? color.error : color.primario} />
    </Pressable>
  );
}

function Etiqueta({ texto, ayuda, requerido }: { texto: string; ayuda?: string; requerido?: boolean }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={e.etiqueta}>
        {texto}
        {requerido ? <Text style={{ color: color.error }}> *</Text> : null}
      </Text>
      {ayuda ? <Text style={e.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

export function CampoTexto({
  etiqueta,
  valor,
  onChange,
  ayuda,
  placeholder,
  requerido,
  multilinea,
  teclado,
  mayusculas,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  ayuda?: string;
  placeholder?: string;
  requerido?: boolean;
  multilinea?: boolean;
  teclado?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  mayusculas?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Etiqueta texto={etiqueta} ayuda={ayuda} requerido={requerido} />
      <TextInput
        accessibilityLabel={etiqueta}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9AA8B6"
        multiline={multilinea}
        keyboardType={teclado}
        autoCapitalize={mayusculas ? 'characters' : 'sentences'}
        style={[e.input, multilinea && { minHeight: 84, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

export function CampoNumero({
  etiqueta,
  valor,
  onChange,
  unidad,
  ayuda,
  placeholder,
  requerido,
  minAncho = 140,
}: {
  etiqueta: string;
  valor: number | undefined;
  onChange: (v: number | undefined) => void;
  unidad?: string;
  ayuda?: string;
  placeholder?: string;
  requerido?: boolean;
  minAncho?: number;
}) {
  const [texto, setTexto] = useState(numeroATexto(valor));
  useEffect(() => {
    if (parsearNumero(texto) !== valor) setTexto(numeroATexto(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);
  const invalido = texto.trim() !== '' && parsearNumero(texto) === undefined;
  return (
    <View style={{ flex: 1, minWidth: minAncho }}>
      <Etiqueta texto={unidad ? `${etiqueta} (${unidad})` : etiqueta} ayuda={ayuda} requerido={requerido} />
      <TextInput
        accessibilityLabel={etiqueta}
        value={texto}
        onChangeText={(t) => {
          setTexto(t);
          onChange(parsearNumero(t));
        }}
        placeholder={placeholder}
        placeholderTextColor="#9AA8B6"
        keyboardType="decimal-pad"
        style={[e.input, invalido && { borderColor: color.error }]}
      />
      {invalido ? <Text style={{ color: color.error, fontSize: 12, marginTop: 4 }}>Introduce un número válido.</Text> : null}
    </View>
  );
}

export function CampoFecha({ etiqueta, valor, onChange }: { etiqueta: string; valor: string; onChange: (iso: string) => void }) {
  const [texto, setTexto] = useState(valor ? isoAFecha(valor) : '');
  useEffect(() => {
    if (!texto || fechaAIso(texto) !== valor) setTexto(valor ? isoAFecha(valor) : texto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);
  const invalida = texto.trim() !== '' && !fechaAIso(texto);
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Etiqueta texto={etiqueta} />
      <TextInput
        accessibilityLabel={etiqueta}
        value={texto}
        onChangeText={(t) => {
          setTexto(t);
          onChange(fechaAIso(t) ?? '');
        }}
        placeholder="DD/MM/AAAA"
        placeholderTextColor="#9AA8B6"
        style={[e.input, invalida && { borderColor: color.error }]}
      />
      {invalida ? <Text style={{ color: color.error, fontSize: 12, marginTop: 4 }}>Usa el formato DD/MM/AAAA.</Text> : null}
    </View>
  );
}

export function Selector<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  onChange,
  ayuda,
  requerido,
  permitirVacio,
}: {
  etiqueta: string;
  opciones: ReadonlyArray<{ valor: T; etiqueta: string }>;
  valor: T | undefined;
  onChange: (v: T | undefined) => void;
  ayuda?: string;
  requerido?: boolean;
  permitirVacio?: boolean;
}) {
  return (
    <View>
      <Etiqueta texto={etiqueta} ayuda={ayuda} requerido={requerido} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`${etiqueta}: ${o.etiqueta}`}
              onPress={() => onChange(activo && permitirVacio ? undefined : o.valor)}
              style={[e.chip, activo && { backgroundColor: color.primario, borderColor: color.primario }]}
            >
              <Text style={[e.chipTexto, activo && { color: '#fff' }]}>{o.etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Interruptor({
  etiqueta,
  valor,
  onChange,
  ayuda,
}: {
  etiqueta: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  ayuda?: string;
}) {
  return (
    <Pressable accessible={false} onPress={() => onChange(!valor)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={e.etiqueta}>{etiqueta}</Text>
        {ayuda ? <Text style={e.ayuda}>{ayuda}</Text> : null}
      </View>
      <Switch accessibilityLabel={etiqueta} value={valor} onValueChange={onChange} trackColor={{ true: color.primario, false: '#CBD5E1' }} thumbColor="#fff" />
    </Pressable>
  );
}

export function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[e.filaEtiqueta]}>{etiqueta}</Text>
      <Text style={[e.filaValor, fuerte && { fontWeight: '700' }]}>{valor}</Text>
    </View>
  );
}

export function Insignia({ texto, tono = 'neutro' }: { texto: string; tono?: 'neutro' | 'ok' | 'error' | 'aviso' | 'primario' }) {
  const t = {
    neutro: { f: '#EAEFF4', c: color.textoSuave },
    ok: { f: color.okSuave, c: color.ok },
    error: { f: color.errorSuave, c: color.error },
    aviso: { f: color.avisoSuave, c: color.aviso },
    primario: { f: color.primarioSuave, c: color.primario },
  }[tono];
  return (
    <View style={{ backgroundColor: t.f, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: t.c, fontSize: 12, fontWeight: '600' }}>{texto}</Text>
    </View>
  );
}

export function ListaAvisos({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      {avisos.map((a, i) => {
        const esError = a.gravedad === 'error';
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              gap: 8,
              padding: 10,
              borderRadius: 8,
              backgroundColor: esError ? color.errorSuave : color.avisoSuave,
            }}
          >
            <Ionicons name={esError ? 'close-circle' : 'warning'} size={18} color={esError ? color.error : color.aviso} />
            <Text style={{ flex: 1, color: esError ? color.error : color.aviso, fontSize: 13, lineHeight: 18 }}>{a.mensaje}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function Vacio({ icono, titulo, texto, children }: { icono: keyof typeof Ionicons.glyphMap; titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 8 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icono} size={30} color={color.primario} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: color.texto, textAlign: 'center' }}>{titulo}</Text>
      <Text style={{ color: color.textoSuave, textAlign: 'center', lineHeight: 20, maxWidth: 420 }}>{texto}</Text>
      {children ? <View style={{ marginTop: 8 }}>{children}</View> : null}
    </View>
  );
}

interface OpcionesConfirmar {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  peligro?: boolean;
}
type Confirmar = (o: OpcionesConfirmar) => Promise<boolean>;
const ContextoConfirmar = createContext<Confirmar>(async () => false);

export function ConfirmarProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<(OpcionesConfirmar & { resolver: (v: boolean) => void }) | null>(null);
  const confirmar = useCallback<Confirmar>((o) => new Promise((resolver) => setEstado({ ...o, resolver })), []);
  const cerrar = (v: boolean) => {
    estado?.resolver(v);
    setEstado(null);
  };
  return (
    <ContextoConfirmar.Provider value={confirmar}>
      {children}
      <Modal visible={!!estado} transparent animationType="fade" onRequestClose={() => cerrar(false)}>
        <View style={e.velo}>
          <View style={e.dialogo}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: color.texto }}>{estado?.titulo}</Text>
            <Text style={{ color: color.textoSuave, lineHeight: 21 }}>{estado?.mensaje}</Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Boton titulo="Cancelar" variante="secundario" onPress={() => cerrar(false)} />
              <Boton
                titulo={estado?.textoConfirmar ?? 'Aceptar'}
                variante={estado?.peligro ? 'peligro' : 'primario'}
                onPress={() => cerrar(true)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ContextoConfirmar.Provider>
  );
}

export function useConfirmar(): Confirmar {
  return useContext(ContextoConfirmar);
}

const e = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  columna: { width: '100%', maxWidth: anchoMaximo, gap: 14 },
  pie: {
    padding: 12,
    backgroundColor: color.superficie,
    borderTopWidth: 1,
    borderTopColor: color.borde,
    alignItems: 'center',
  },
  tarjeta: {
    backgroundColor: color.superficie,
    borderRadius: radio,
    padding: 16,
    borderWidth: 1,
    borderColor: color.borde,
  },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: color.texto },
  ayuda: { fontSize: 12.5, color: color.textoSuave, lineHeight: 17, marginTop: 2 },
  etiqueta: { fontSize: 13.5, fontWeight: '600', color: color.texto },
  input: {
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 9,
    fontSize: 15,
    color: color.texto,
    backgroundColor: '#FBFCFE',
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  botonTexto: { fontSize: 15, fontWeight: '600' },
  botonIcono: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: '#FBFCFE',
  },
  chipTexto: { fontSize: 14, color: color.texto, fontWeight: '500' },
  filaEtiqueta: { color: color.textoSuave, fontSize: 14, flexShrink: 1 },
  filaValor: { color: color.texto, fontSize: 14, textAlign: 'right', flexShrink: 1 },
  velo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialogo: { backgroundColor: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: 420, gap: 10 },
});

export function CampoNumeroCompacto({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const [texto, setTexto] = useState(numeroATexto(valor));
  useEffect(() => {
    if (parsearNumero(texto) !== valor) setTexto(numeroATexto(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);
  return (
    <TextInput
      accessibilityLabel={etiqueta}
      value={texto}
      onChangeText={(t) => {
        setTexto(t);
        onChange(parsearNumero(t));
      }}
      placeholder="—"
      placeholderTextColor="#9AA8B6"
      keyboardType="decimal-pad"
      style={[e.input, { textAlign: 'center', paddingHorizontal: 4, minWidth: 0 }]}
    />
  );
}

export function SelectorLista({
  etiqueta,
  valorTexto,
  opciones,
  onSeleccionar,
  placeholder,
}: {
  etiqueta: string;
  valorTexto: string;
  opciones: Array<{ clave: string; texto: string }>;
  onSeleccionar: (clave: string) => void;
  placeholder?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const filtradas = opciones.filter((o) => o.texto.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Etiqueta texto={etiqueta} />
      <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} onPress={() => setAbierto(true)} style={[e.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={{ color: valorTexto ? color.texto : '#9AA8B6', fontSize: 15 }}>{valorTexto || placeholder || 'Seleccionar…'}</Text>
        <Ionicons name="chevron-down" size={18} color={color.textoSuave} />
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <View style={e.velo}>
          <View style={[e.dialogo, { maxHeight: '80%' }]}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: color.texto }}>{etiqueta}</Text>
            <TextInput
              accessibilityLabel={`Buscar ${etiqueta}`}
              value={q}
              onChangeText={setQ}
              placeholder="Buscar…"
              placeholderTextColor="#9AA8B6"
              style={e.input}
            />
            <ScrollView style={{ maxHeight: 360 }}>
              {filtradas.map((o) => (
                <Pressable
                  key={o.clave}
                  accessibilityRole="button"
                  accessibilityLabel={o.texto}
                  onPress={() => {
                    onSeleccionar(o.clave);
                    setAbierto(false);
                    setQ('');
                  }}
                  style={({ pressed }) => ({ paddingVertical: 11, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: color.borde, backgroundColor: pressed ? color.primarioSuave : 'transparent' })}
                >
                  <Text style={{ color: color.texto, fontSize: 15 }}>{o.texto}</Text>
                </Pressable>
              ))}
              {filtradas.length === 0 ? <Text style={{ color: color.textoSuave, padding: 12 }}>Sin resultados.</Text> : null}
            </ScrollView>
            <Boton titulo="Cerrar" variante="secundario" onPress={() => setAbierto(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function Nota({ texto, tono = 'neutro' }: { texto: string; tono?: 'neutro' | 'aviso' | 'ok' }) {
  const t = { neutro: [color.primarioSuave, color.primario], aviso: [color.avisoSuave, color.aviso], ok: [color.okSuave, color.ok] }[tono];
  return (
    <View style={{ padding: 10, borderRadius: 8, backgroundColor: t[0] }}>
      <Text style={{ color: t[1], fontSize: 13, lineHeight: 18 }}>{texto}</Text>
    </View>
  );
}
