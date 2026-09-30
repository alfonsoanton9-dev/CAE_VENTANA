import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { color } from '@/ui/tema';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.primario },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: color.primario,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
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
