import { createElement, useEffect, useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { generarId } from '@/domain/fabrica';
import type { Adjunto } from '@/domain/tipos';
import { color, radio } from '@/ui/tema';

/**
 * Zona de firma táctil (canvas en web). Devuelve un Adjunto PNG en base64.
 */
export function ZonaFirma({
  valor,
  onChange,
}: {
  valor?: Adjunto;
  onChange: (a: Adjunto | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const trazoRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#14202E';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (valor?.contenidoBase64) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = `data:${valor.mime};base64,${valor.contenidoBase64}`;
      trazoRef.current = true;
    }
  }, [valor?.id]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ padding: 12, borderRadius: radio, borderWidth: 1, borderColor: color.borde, backgroundColor: color.fondo }}>
        <Text style={{ color: color.textoSuave }}>La firma táctil está disponible en la versión web / móvil navegador.</Text>
      </View>
    );
  }

  const pos = (e: { clientX: number; clientY: number }) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const empezar = (e: any) => {
    const ev = e.nativeEvent?.touches?.[0] ?? e.nativeEvent ?? e;
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    dibujando.current = true;
    const p = pos(ev);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const mover = (e: any) => {
    if (!dibujando.current) return;
    const ev = e.nativeEvent?.touches?.[0] ?? e.nativeEvent ?? e;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    e.preventDefault?.();
    const p = pos(ev);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    trazoRef.current = true;
  };

  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    const c = canvasRef.current;
    if (!c || !trazoRef.current) return;
    const dataUrl = c.toDataURL('image/png');
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    onChange({
      id: generarId(),
      nombre: 'firma-contrato-compraventa.png',
      mime: 'image/png',
      tamanoBytes: Math.round((base64.length * 3) / 4),
      contenidoBase64: base64,
      subidoEn: new Date().toISOString(),
    });
  };

  const limpiar = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    trazoRef.current = false;
    onChange(undefined);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: '700', color: color.texto }}>Zona de firma (móvil / táctil)</Text>
      <Text style={{ color: color.textoSuave, fontSize: 12.5 }}>Firma con el dedo o el ratón dentro del recuadro.</Text>
      {createElement('canvas', {
        ref: canvasRef,
        width: 640,
        height: 220,
        style: {
          width: '100%',
          maxWidth: 640,
          height: 180,
          borderRadius: radio,
          border: `1px solid ${color.borde}`,
          background: '#fff',
          touchAction: 'none',
          display: 'block',
        } as any,
        onMouseDown: empezar,
        onMouseMove: mover,
        onMouseUp: terminar,
        onMouseLeave: terminar,
        onTouchStart: empezar,
        onTouchMove: mover,
        onTouchEnd: terminar,
      })}
      <Pressable
        accessibilityRole="button"
        onPress={limpiar}
        style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: color.borde }}
      >
        <Text style={{ color: color.textoSuave, fontWeight: '600' }}>Limpiar firma</Text>
      </Pressable>
    </View>
  );
}
