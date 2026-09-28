import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export const unstable_settings = { initialRouteName: 'sign-in' };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="check-email" />
    </Stack>
  );
}
