import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../utils/theme';

type Item<T extends string> = { value: T; label: string };
export default function SegmentedControl<T extends string>({
  items, value, onChange,
}: { items: Item<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.wrap}>
      {items.map(it => {
        const active = it.value === value;
        return (
          <TouchableOpacity key={it.value} onPress={() => onChange(it.value)}
            style={[styles.btn, active && styles.btnActive]}>
            <Text style={[styles.txt, active && styles.txtActive]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 999, borderWidth: 1, borderColor: theme.border, padding: 4 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  btnActive: { backgroundColor: theme.primary },
  txt: { color: theme.primaryDark, fontWeight: '700' },
  txtActive: { color: '#FFF' },
});
