import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { color } from '@/ui/tema';

const esWeb = Platform.OS === 'web';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.primario },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: color.primario,
        tabBarInactiveTintColor: color.textoSuave,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        tabBarPosition: esWeb ? 'top' : 'bottom',
        tabBarStyle: esWeb
          ? {
              backgroundColor: '#fff',
              borderBottomWidth: 1,
              borderTopWidth: 0,
              borderBottomColor: color.borde,
              height: 56,
              paddingTop: 4,
            }
          : undefined,
        sceneStyle: { backgroundColor: color.fondo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Expedientes',
          headerTitle: 'CAE Ventanas',
          tabBarIcon: ({ color: c, size }) => <Ionicons name="folder-open-outline" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="usuario"
        options={{
          title: 'Usuario',
          headerTitle: 'Espacio de usuario',
          tabBarIcon: ({ color: c, size }) => <Ionicons name="person-circle-outline" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          headerTitle: 'Ajustes de cálculo',
          tabBarIcon: ({ color: c, size }) => <Ionicons name="options-outline" color={c} size={size} />,
        }}
      />
    </Tabs>
  );
}
