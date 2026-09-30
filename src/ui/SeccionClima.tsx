import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { deducirAltitud, deducirZona } from '@/domain/clima';
import { formatoNumero } from '@/domain/formato';
import { obtenerG, type Parametros } from '@/domain/parametros';
import { ZONAS_INVIERNO, ZONAS_VERANO, type ExpedienteBorrador } from '@/domain/tipos';
import { codigosProvincia, provinciaDesdeCodigoPostal, ubicacionDeProvincia } from '@/domain/zonasClimaticas';
import { Boton, CampoNumero, Nota, Selector, SelectorLista, Seccion } from './componentes';
import { color } from './tema';

type EstadoBusqueda = { estado: 'reposo' } | { estado: 'buscando' } | { estado: 'ok' | 'aviso'; mensaje: string };

const RETARDO_BUSQUEDA_MS = 1200;

const TEXTO_ORIGEN_PROVINCIA = {
  'codigo-postal': 'Deducida de los dos primeros dígitos del código postal.',
  manual: 'Elegida a mano.',
  '': 'Sin determinar: indica un código postal válido o elige la provincia.',
} as const;

const TEXTO_ORIGEN_ALTITUD = {
  geocodificacion: 'Servicios públicos: geocodificación de la dirección + modelo digital de elevaciones.',
  'centro-cp': 'Servicios públicos: centro del código postal (no se localizó la dirección exacta).',
  capital: 'Respaldo: altitud de referencia de la capital de provincia.',
  manual: 'Introducida a mano.',
  '': 'Sin determinar.',
} as const;

export function SeccionClima({
  d,
  setD,
  parametros,
  inicialTieneAltitud,
}: {
  d: ExpedienteBorrador;
  setD: (fn: (x: ExpedienteBorrador) => ExpedienteBorrador) => void;
  parametros: Parametros;
  inicialTieneAltitud: boolean;
}) {
  const tabla = parametros.zonasClimaticas;
  const [busqueda, setBusqueda] = useState<EstadoBusqueda>({ estado: 'reposo' });
  const ultimaClave = useRef<string | null>(inicialTieneAltitud ? claveConsulta(d) : null);
  const peticion = useRef(0);

  const provincias = useMemo(
    () => codigosProvincia(tabla).map((c) => ({ clave: c, texto: `${c} · ${tabla[c].nombre}` })),
    [tabla],
  );

  // Provincia desde el código postal (salvo que se haya fijado a mano).
  useEffect(() => {
    if (d.origenClima.provincia === 'manual') return;
    const r = provinciaDesdeCodigoPostal(d.codigoPostal, tabla);
    if (!r || (r.codigo === d.provinciaCodigo && d.origenClima.provincia === 'codigo-postal')) return;
    setD((x) => ({
      ...x,
      provinciaCodigo: r.codigo,
      provincia: r.provincia.nombre,
      ubicacion: ubicacionDeProvincia(r.codigo),
      origenClima: { ...x.origenClima, provincia: 'codigo-postal' },
    }));
  }, [d.codigoPostal, d.origenClima.provincia, d.provinciaCodigo, tabla, setD]);

  const clave = claveConsulta(d);
  const puedeBuscar = !!d.provinciaCodigo && /^\d{5}$/.test(d.codigoPostal.trim());

  const buscar = async () => {
    if (!puedeBuscar) return;
    const id = ++peticion.current;
    ultimaClave.current = clave;
    setBusqueda({ estado: 'buscando' });
    const r = await deducirAltitud({ direccion: d.direccion, codigoPostal: d.codigoPostal, municipio: d.municipio }, tabla);
    if (id !== peticion.current) return;
    if (!r) {
      setBusqueda({ estado: 'aviso', mensaje: 'No se pudo deducir la altitud: revisa el código postal.' });
      return;
    }
    setD((x) => ({
      ...x,
      altitudM: r.altitudM,
      latitud: r.latitud,
      longitud: r.longitud,
      origenClima: { ...x.origenClima, altitud: r.origen, altitudDetalle: r.detalle },
    }));
    setBusqueda(r.aviso ? { estado: 'aviso', mensaje: r.aviso } : { estado: 'ok', mensaje: 'Altitud actualizada.' });
  };
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  // Búsqueda automática (con retardo para no consultar en cada pulsación).
  useEffect(() => {
    if (d.origenClima.altitud === 'manual' || !puedeBuscar || ultimaClave.current === clave) return;
    const t = setTimeout(() => void buscarRef.current(), RETARDO_BUSQUEDA_MS);
    return () => clearTimeout(t);
  }, [clave, puedeBuscar, d.origenClima.altitud]);

  useEffect(
    () => () => {
      peticion.current++;
    },
    [],
  );

  const zonaAuto = useMemo(() => deducirZona(tabla, d.provinciaCodigo, d.altitudM), [tabla, d.provinciaCodigo, d.altitudM]);

  // Zona automática (salvo que se haya corregido a mano).
  useEffect(() => {
    if (d.origenClima.zona !== 'automatica') return;
    const invierno = zonaAuto?.invierno;
    const verano = zonaAuto?.verano;
    if (invierno === d.zonaInvierno && verano === d.zonaVerano) return;
    setD((x) => ({ ...x, zonaInvierno: invierno, zonaVerano: verano }));
  }, [zonaAuto, d.origenClima.zona, d.zonaInvierno, d.zonaVerano, setD]);

  const g = obtenerG(parametros, d.zonaInvierno, d.zonaVerano);
  const prov = d.provinciaCodigo ? tabla[d.provinciaCodigo] : undefined;
  const cpValido = provinciaDesdeCodigoPostal(d.codigoPostal, tabla);
  const discrepancia = d.origenClima.provincia === 'manual' && cpValido && cpValido.codigo !== d.provinciaCodigo;
  const zonaManual = d.origenClima.zona === 'manual';
  const canarias = d.ubicacion === 'canarias';

  return (
    <>
      <Seccion
        titulo="Ubicación y altitud"
        ayuda="La provincia sale del código postal y la altitud de la dirección. Ambas se pueden corregir a mano."
      >
        <SelectorLista
          etiqueta="Provincia"
          valorTexto={prov ? `${d.provinciaCodigo} · ${prov.nombre}` : d.provincia}
          placeholder="Se deduce del código postal"
          opciones={provincias}
          onSeleccionar={(c) =>
            setD((x) => ({
              ...x,
              provinciaCodigo: c,
              provincia: tabla[c].nombre,
              ubicacion: ubicacionDeProvincia(c),
              origenClima: { ...x.origenClima, provincia: 'manual' },
            }))
          }
        />
        <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>
          Origen: {TEXTO_ORIGEN_PROVINCIA[d.origenClima.provincia]}
          {prov ? ` Capital: ${prov.capital} (h0 = ${formatoNumero(prov.altitudReferenciaM, 0)} m).` : ''}
        </Text>
        {d.origenClima.provincia === 'manual' && cpValido ? (
          <Boton
            titulo="Usar la provincia del código postal"
            variante="texto"
            icono="refresh"
            onPress={() =>
              setD((x) => ({
                ...x,
                provinciaCodigo: cpValido.codigo,
                provincia: cpValido.provincia.nombre,
                ubicacion: ubicacionDeProvincia(cpValido.codigo),
                origenClima: { ...x.origenClima, provincia: 'codigo-postal' },
              }))
            }
          />
        ) : null}
        {discrepancia ? (
          <Nota tono="aviso" texto={`El código postal ${d.codigoPostal} corresponde a ${cpValido.provincia.nombre}, pero has elegido ${prov?.nombre}.`} />
        ) : null}

        <CampoNumero
          etiqueta="Altitud del emplazamiento"
          unidad="m"
          valor={d.altitudM}
          onChange={(v) =>
            setD((x) => ({
              ...x,
              altitudM: v,
              origenClima: v === undefined ? { ...x.origenClima, altitud: '', altitudDetalle: '' } : { ...x.origenClima, altitud: 'manual', altitudDetalle: 'Introducida a mano.' },
            }))
          }
          ayuda="Metros sobre el nivel del mar. Determina el tramo de la tabla a-Anejo B."
        />
        <View style={{ gap: 4 }}>
          <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>Origen: {TEXTO_ORIGEN_ALTITUD[d.origenClima.altitud]}</Text>
          {d.origenClima.altitudDetalle && d.origenClima.altitud !== 'manual' ? (
            <Text style={{ color: color.textoSuave, fontSize: 12 }}>{d.origenClima.altitudDetalle}</Text>
          ) : null}
        </View>
        {busqueda.estado === 'buscando' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={color.primario} />
            <Text style={{ color: color.textoSuave }}>Consultando servicios de geocodificación y elevación…</Text>
          </View>
        ) : null}
        {busqueda.estado === 'aviso' ? <Nota tono="aviso" texto={busqueda.mensaje} /> : null}
        {busqueda.estado === 'ok' ? <Nota tono="ok" texto={busqueda.mensaje} /> : null}
        {d.origenClima.altitud === 'capital' && busqueda.estado === 'reposo' ? (
          <Nota tono="aviso" texto="La altitud es la de la capital de provincia (respaldo). Corrígela si el edificio está a otra cota." />
        ) : null}
        <Boton
          titulo={d.origenClima.altitud === 'manual' ? 'Deducir de nuevo desde la dirección' : 'Deducir altitud desde la dirección'}
          variante="secundario"
          icono="locate"
          deshabilitado={!puedeBuscar || busqueda.estado === 'buscando'}
          onPress={() => {
            setD((x) => ({ ...x, origenClima: { ...x.origenClima, altitud: '' } }));
            void buscar();
          }}
        />
        {!puedeBuscar ? <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>Indica un código postal de 5 dígitos para poder consultar la altitud.</Text> : null}
      </Seccion>

      <Seccion titulo="Zona climática" ayuda="Tabla a-Anejo B del CTE DB HE (configurable en Ajustes). Determina el coeficiente G del Anexo II.">
        {canarias ? (
          <Nota tono="aviso" texto="Canarias (zonas α, A2, B2, C2…) queda fuera del ámbito de la ficha RES070: no hay coeficiente G y el expediente no se puede calcular." />
        ) : null}
        <Selector
          etiqueta="Zona climática de invierno (ZCI)"
          opciones={ZONAS_INVIERNO.map((z) => ({ valor: z, etiqueta: z }))}
          valor={d.zonaInvierno}
          onChange={(v) => setD((x) => ({ ...x, zonaInvierno: v, origenClima: { ...x.origenClima, zona: 'manual' } }))}
          permitirVacio
        />
        <Selector
          etiqueta="Zona climática de verano (ZCV)"
          opciones={ZONAS_VERANO.map((z) => ({ valor: z, etiqueta: String(z) }))}
          valor={d.zonaVerano}
          onChange={(v) => setD((x) => ({ ...x, zonaVerano: v, origenClima: { ...x.origenClima, zona: 'manual' } }))}
          permitirVacio
        />
        <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>
          Origen: {zonaManual ? 'Elegida a mano.' : zonaAuto ? `Automática · ${zonaAuto.descripcion}.` : 'Automática: pendiente de provincia y altitud.'}
        </Text>
        {zonaManual ? (
          <Boton
            titulo={zonaAuto ? `Volver a la zona automática (${zonaAuto.texto})` : 'Volver a la zona automática'}
            variante="secundario"
            icono="refresh"
            onPress={() => setD((x) => ({ ...x, origenClima: { ...x.origenClima, zona: 'automatica' } }))}
          />
        ) : null}
        {zonaManual && zonaAuto && !zonaAuto.fueraDeFicha && (zonaAuto.invierno !== d.zonaInvierno || zonaAuto.verano !== d.zonaVerano) ? (
          <Nota tono="aviso" texto={`La zona elegida (${d.zonaInvierno ?? '–'}${d.zonaVerano ?? '–'}) difiere de la que da la tabla (${zonaAuto.texto}).`} />
        ) : null}
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: g !== null ? color.primarioSuave : color.avisoSuave }}>
          <Text style={{ color: g !== null ? color.primario : color.aviso, fontWeight: '600' }}>
            {!d.zonaInvierno || !d.zonaVerano
              ? 'Sin zona: indica provincia y altitud o elige ZCI y ZCV para obtener G.'
              : g !== null
                ? `Zona ${d.zonaInvierno}${d.zonaVerano}: G = ${formatoNumero(g, 0)} miles de horas·K/año`
                : `La combinación ${d.zonaInvierno}${d.zonaVerano} no tiene valor de G en el Anexo II.`}
          </Text>
        </View>
      </Seccion>
    </>
  );
}

function claveConsulta(d: ExpedienteBorrador): string {
  return [d.codigoPostal.trim(), d.direccion.trim().toLowerCase(), d.municipio.trim().toLowerCase()].join('|');
}
