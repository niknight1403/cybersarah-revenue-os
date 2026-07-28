import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export function SettingsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingTop: insets.top}>
      <Text style={fontSize: 48, marginBottom: 16}>⚙️</Text>
      <Text style={fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8}>Einstellungen</Text>
      <Text style={fontSize: 15, color: colors.textMuted, textAlign: 'center'}>
        Wird im naechsten Sprint implementiert
      </Text>
    </View>
  );
}
