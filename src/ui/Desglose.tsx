import { Text, View } from 'react-native';
import type { DesgloseVentana, ResultadoExpediente } from '@/domain/calculo';
import { formatoNumero } from '@/domain/formato';
import type { Parametros } from '@/domain/parametros';
import { Fila } from './componentes';
import { color } from './tema';

export function DesgloseLineaVentana({ d }: { d: DesgloseVentana }) {
  return (
    <View style={{ gap: 6 }}>
      <Fila etiqueta="Uhi (situación anterior)" valor={`${formatoNumero(d.uhi)} W/m²·K`} />
      <Fila etiqueta="Uhf (situación nueva)" valor={`${formatoNumero(d.uhf)} W/m²·K`} />
      <Fila etiqueta="Uhi − Uhf" valor={`${formatoNumero(d.deltaU)} W/m²·K`} />
      <Fila
        etiqueta={d.unidades > 1 ? `S (${formatoNumero(d.superficieUnitaria)} m² × ${d.unidades} uds.)` : 'S (superficie del hueco)'}
        valor={`${formatoNumero(d.superficie)} m²`}
      />
      <Fila etiqueta="G (zona climática)" valor={d.g === null ? 'No definido' : `${formatoNumero(d.g, 0)} miles h·K/año`} />
      <Fila etiqueta="Fp" valor={formatoNumero(d.fp, 2)} />
      <View style={{ height: 1, backgroundColor: color.borde, marginVertical: 2 }} />
      <Text style={{ fontFamily: 'monospace', fontSize: 12.5, color: color.textoSuave }}>
        {d.completa
          ? `AE = ${formatoNumero(d.fp, 2)} × (${formatoNumero(d.uhi)} − ${formatoNumero(d.uhf)}) × ${formatoNumero(d.superficie)} × ${formatoNumero(d.g, 0)}`
          : 'AE = Fp × (Uhi − Uhf) × S × G'}
      </Text>
      <Fila etiqueta="AE de la ventana" valor={d.ae === null ? 'Datos incompletos' : `${formatoNumero(d.ae)} kWh/año`} fuerte />
    </View>
  );
}

export function TablaDesglose({ r, p }: { r: ResultadoExpediente; p: Parametros }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ padding: 12, borderRadius: 10, backgroundColor: color.primarioSuave, gap: 4 }}>
        <Text style={{ fontFamily: 'monospace', color: color.primario, fontWeight: '700' }}>AE_TOTAL = Fp · Σ (Uhi − Uhf)ᵢ · Sᵢ · G</Text>
        <Text style={{ color: color.primario, fontSize: 12.5 }}>kWh/año · G en miles de horas·K/año · Fp = {formatoNumero(r.fp, 2)}</Text>
      </View>

      {r.ventanas.length === 0 ? (
        <Text style={{ color: color.textoSuave }}>Añade ventanas para ver el desglose.</Text>
      ) : (
        r.ventanas.map((d, i) => (
          <View key={d.ventanaId} style={{ borderWidth: 1, borderColor: color.borde, borderRadius: 10, padding: 12, gap: 8 }}>
            <Text style={{ fontWeight: '700', color: color.texto }}>
              {i + 1}. {d.etiqueta || 'Sin etiqueta'}
            </Text>
            <DesgloseLineaVentana d={d} />
          </View>
        ))
      )}

      <View style={{ gap: 6, borderTopWidth: 2, borderTopColor: color.borde, paddingTop: 12 }}>
        <Fila etiqueta="Ventanas calculadas" valor={`${r.ventanasCalculadas} de ${r.ventanas.length}`} />
        <Fila etiqueta="Σ (Uhi − Uhf)·S·G" valor={`${formatoNumero(r.sumatorioBruto)} kWh/año`} />
        <Fila etiqueta={`× Fp (${formatoNumero(r.fp, 2)})`} valor={`${formatoNumero(r.aeTotal)} kWh/año`} fuerte />
        {r.multiplicadorDuracion !== 1 ? <Fila etiqueta="× Di (años)" valor={formatoNumero(r.multiplicadorDuracion, 0)} /> : null}
        <Fila etiqueta={`÷ ${formatoNumero(p.kwhPorCae, 0)} kWh por CAE`} valor={`${formatoNumero(r.cae)} CAE`} fuerte />
      </View>
    </View>
  );
}
