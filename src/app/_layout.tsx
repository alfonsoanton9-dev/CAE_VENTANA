import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlmacenProvider } from '@/store/almacen';
import { ConfirmarProvider } from '@/ui/componentes';
import { color } from '@/ui/tema';

export default function RootLayout() {
  return (
    <AlmacenProvider>
      <ConfirmarProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: color.primario },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            headerBackTitle: 'Atrás',
            contentStyle: { backgroundColor: color.fondo },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="expediente/nuevo" options={{ title: 'Nuevo expediente' }} />
          <Stack.Screen name="expediente/[id]/index" options={{ title: 'Expediente' }} />
          <Stack.Screen name="expediente/[id]/editar" options={{ title: 'Editar expediente' }} />
          <Stack.Screen name="expediente/[id]/actuacion/nueva" options={{ title: 'Nueva actuación' }} />
          <Stack.Screen name="expediente/[id]/actuacion/[actuacionId]/index" options={{ title: 'Actuación' }} />
          <Stack.Screen name="expediente/[id]/actuacion/[actuacionId]/editar" options={{ title: 'Editar actuación' }} />
          <Stack.Screen name="expediente/[id]/actuacion/[actuacionId]/ventana/[ventanaId]" options={{ title: 'Ventana' }} />
        </Stack>
      </ConfirmarProvider>
    </AlmacenProvider>
  );
}
