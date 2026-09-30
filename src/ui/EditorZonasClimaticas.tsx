import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { formatoNumero } from '@/domain/formato';
import { tablaZonasOficial, type TablaZonas, type Tramo } from '@/domain/zonasClimaticas';
import { codigosProvincia, etiquetaTramo, validarTramos } from '@/domain/zonasClimaticas';
import { Boton, CampoNumeroCompacto, CampoTexto, Nota, SelectorLista } from './componentes';
import { color } from './tema';

export function EditorZonasClimaticas({ tabla, onChange }: { tabla: TablaZonas; onChange: (t: TablaZonas) => void }) {
  const opciones = useMemo(() => codigosProvincia(tabla).map((c) => ({ clave: c, texto: `${c} · ${tabla[c].nombre}` })), [tabla]);
  const [codigo, setCodigo] = useState('28');
  const prov = tabla[codigo];
  const oficial = tablaZonasOficial()[codigo];
  const modificado = JSON.stringify(prov.tramos) !== JSON.stringify(oficial.tramos);

  const actualizarTramos = (tramos: Tramo[]) => {
    const err = validarTramos(tramos);
    if (err) return err;
    onChange({ ...tabla, [codigo]: { ...prov, tramos } });
    return undefined;
  };

  const [errorLocal, setErrorLocal] = useState<string | undefined>();

  const editarTramo = (i: number, parcial: Partial<Tramo>) => {
    const tramos = prov.tramos.map((t, j) => (j === i ? { ...t, ...parcial } : t));
    setErrorLocal(actualizarTramos(tramos));
  };

  const añadirTramo = () => {
    const ultimo = prov.tramos[prov.tramos.length - 1];
    if (ultimo?.hasta === null) {
      setErrorLocal('El último tramo ya no tiene límite: no se puede añadir otro.');
      return;
    }
    const tramos = [...prov.tramos.slice(0, -1), { ...ultimo, hasta: (ultimo?.hasta ?? 0) + 50 }, { hasta: null, zona: ultimo?.zona ?? 'D3' }];
    setErrorLocal(actualizarTramos(tramos));
  };

  const quitarTramo = (i: number) => {
    if (prov.tramos.length <= 1) return;
    const tramos = prov.tramos.filter((_, j) => j !== i);
    if (tramos[tramos.length - 1].hasta !== null) tramos[tramos.length - 1] = { ...tramos[tramos.length - 1], hasta: null };
    setErrorLocal(actualizarTramos(tramos));
  };

  const restaurarProvincia = () => {
    setErrorLocal(undefined);
    onChange({ ...tabla, [codigo]: { ...prov, tramos: oficial.tramos.map((t) => ({ ...t })) } });
  };

  return (
    <View style={{ gap: 12 }}>
      <SelectorLista etiqueta="Provincia a editar" valorTexto={`${codigo} · ${prov.nombre}`} opciones={opciones} onSeleccionar={(c) => { setCodigo(c); setErrorLocal(undefined); }} />
      <Text style={{ color: color.textoSuave, fontSize: 13 }}>
        Capital: {prov.capital} · h0 = {formatoNumero(prov.altitudReferenciaM, 0)} m (dato informativo del Anejo B).
      </Text>
      {modificado ? <Nota tono="aviso" texto="Los tramos de esta provincia difieren de los valores oficiales del CTE." /> : null}
      <View style={{ gap: 8 }}>
        {prov.tramos.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: color.borde }}>
            <View style={{ minWidth: 120 }}>
              <Text style={{ fontSize: 12, color: color.textoSuave, marginBottom: 4 }}>Altitud {etiquetaTramo(prov, i)}</Text>
            </View>
            {i < prov.tramos.length - 1 ? (
              <CampoNumeroCompacto etiqueta="Hasta (m)" valor={t.hasta ?? undefined} onChange={(v) => editarTramo(i, { hasta: v ?? null })} />
            ) : (
              <Text style={{ color: color.textoSuave, fontSize: 13, paddingBottom: 10 }}>Sin límite superior</Text>
            )}
            <View style={{ flex: 1, minWidth: 100 }}>
              <CampoTexto etiqueta="Zona (ej. D3)" valor={t.zona} onChange={(z) => editarTramo(i, { zona: z })} />
            </View>
            {prov.tramos.length > 1 ? <Boton titulo="Quitar" variante="texto" onPress={() => quitarTramo(i)} /> : null}
          </View>
        ))}
      </View>
      {errorLocal ? <Text style={{ color: color.error, fontSize: 12.5 }}>{errorLocal}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Boton titulo="Añadir tramo" variante="secundario" icono="add" onPress={añadirTramo} />
        <Boton titulo="Restaurar esta provincia" variante="texto" icono="refresh" onPress={restaurarProvincia} deshabilitado={!modificado} />
      </View>
    </View>
  );
}

export function validarTablaZonas(t: TablaZonas): string | undefined {
  for (const c of codigosProvincia(t)) {
    const err = validarTramos(t[c].tramos);
    if (err) return `${t[c].nombre}: ${err}`;
  }
  return undefined;
}
