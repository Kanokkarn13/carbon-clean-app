import { View, Text, StyleSheet } from 'react-native';
import theme from '../utils/theme';

export default function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value.toFixed(1)}%</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    alignItems: 'center',
  },
  label: { color: theme.sub, fontWeight: '700' },
  value: { color: theme.text, fontWeight: '800', fontSize: 20, marginTop: 6 },
});
