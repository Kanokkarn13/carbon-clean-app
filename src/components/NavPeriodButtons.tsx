import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

type Props = {
  onPrev: () => void;
  onThis: () => void;
  onNext: () => void;
};

export default function NavPeriodButtons({ onPrev, onThis, onNext }: Props) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.iconBtn} onPress={onPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={16} color={theme.primary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.thisBtn} onPress={onThis} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.thisText}>This</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconBtn} onPress={onNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-forward" size={16} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    height: 32, width: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1E7DF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  thisBtn: {
    minWidth: 52,
    height: 32,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1E7DF',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thisText: { color: theme.primary, fontWeight: '800' },
});
