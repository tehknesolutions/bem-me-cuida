import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="check-in" options={{ title: 'Check-in' }} />
      <Tabs.Screen name="diary" options={{ title: 'Diário' }} />
      <Tabs.Screen name="care" options={{ title: 'Cuidado' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 64, paddingTop: 8 },
  label: { fontSize: 11, fontWeight: '600' },
});
