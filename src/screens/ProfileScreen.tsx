import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { updateUser } from '../services/authService';
import { emissionData } from '../hooks/calculateEmission';

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

const VEHICLE_TYPES = ['Cars', 'Motorbike', 'Bus', 'Taxis'] as const;
const FUEL_TYPES = ['Petrol', 'Diesel', 'Unknown'] as const;

function Card({ children, title, icon }: { children: React.ReactNode; title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={theme.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      activeOpacity={0.85}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  scrollable = false,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  scrollable?: boolean;
}) {
  const content = options.map(opt => (
    <Chip key={opt} label={opt} active={opt === value} onPress={() => onChange(opt)} />
  ));
  if (!scrollable) return <View style={styles.chipRow}>{content}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {content}
    </ScrollView>
  );
}

function LabeledInput(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput {...rest} style={[styles.input, style]} placeholderTextColor={theme.sub} />
      </View>
    </View>
  );
}

const ProfileScreen = ({ route }: { route: any }) => {
  const navigation = useNavigation();
  const { user } = route.params;

  const [fname, setName] = useState(user.fname);
  const [lname, setLname] = useState(user.lname);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [houseMember, setHouseMember] = useState(
    user.house_member ? String(user.house_member) : ''
  );

  const [vehicleType, setVehicleType] = useState<(typeof VEHICLE_TYPES)[number]>('Cars');
  const [fuelType, setFuelType] = useState<(typeof FUEL_TYPES)[number]>('Petrol');
  const [vehicleClass, setVehicleClass] = useState<string>('Small car');

  // Initialize from user.vehicle "Type,Fuel,Size"
  useEffect(() => {
    if (!user?.vehicle) return;
    const [type, fuel, size] = String(user.vehicle).split(',');
    if (type) setVehicleType(type as any);
    if (fuel) setFuelType(fuel as any);
    if (size) setVehicleClass(type === 'Cars' ? `${size} car` : size);
  }, [user?.vehicle]);

  const getFuelOptions = (type: string) => (type === 'Cars' ? FUEL_TYPES : (['Unknown'] as const));
  const getClassOptions = (type: string, fuel: string) =>
    type === 'Cars'
      ? Object.keys(emissionData[fuel] || {})
      : Object.keys(emissionData[type] || {});

  const classOptions = useMemo(
    () => getClassOptions(vehicleType, fuelType),
    [vehicleType, fuelType]
  );

  const onChangeVehicleType = (t: (typeof VEHICLE_TYPES)[number]) => {
    setVehicleType(t);
    const fuels = getFuelOptions(t);
    const newFuel = fuels[0] as any;
    setFuelType(newFuel);
    const firstClass = getClassOptions(t, newFuel)[0] || '';
    setVehicleClass(firstClass);
  };

  const onChangeFuel = (f: (typeof FUEL_TYPES)[number]) => {
    setFuelType(f);
    const firstClass = getClassOptions('Cars', f)[0] || '';
    setVehicleClass(firstClass);
  };

  const onChangeClass = (cls: string) => setVehicleClass(cls);

  const handleSave = async () => {
    const vehicleString =
      vehicleType === 'Cars'
        ? `${vehicleType},${fuelType},${vehicleClass.replace(' car', '')}`
        : `${vehicleType},Unknown,${vehicleClass}`;

    const userData = {
      user_id: user.user_id,
      fname,
      lname,
      email,
      phone,
      vehicle: vehicleString,
      house_member: parseInt(houseMember || '0', 10),
    };

    try {
      await updateUser(userData);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('❌ Failed to update user:', error);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header with Back */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Avatar card */}
        <Card title="Your Info" icon="person-circle-outline">
          <Image
            source={{
              uri:
                user.profile_picture ||
                'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            }}
            style={styles.avatar}
          />
          <LabeledInput label="First Name" value={fname} onChangeText={setName} placeholder="First name" />
          <LabeledInput label="Last Name" value={lname} onChangeText={setLname} placeholder="Last name" />
          <LabeledInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <LabeledInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            keyboardType="phone-pad"
          />
          <LabeledInput
            label="Household Members"
            value={houseMember}
            onChangeText={setHouseMember}
            placeholder="Number of people"
            keyboardType="numeric"
          />
        </Card>

        {/* Vehicle preferences */}
        <Card title="Vehicle Preference" icon="car-outline">
          <Text style={styles.label}>Vehicle Type</Text>
          <ChipGroup
            options={VEHICLE_TYPES as unknown as string[]}
            value={vehicleType}
            onChange={(v) => onChangeVehicleType(v as any)}
            scrollable
          />

          {vehicleType === 'Cars' && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Fuel Type</Text>
              <ChipGroup
                options={getFuelOptions('Cars') as unknown as string[]}
                value={fuelType}
                onChange={(v) => onChangeFuel(v as any)}
              />
            </>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Vehicle Class</Text>
          <ChipGroup
            options={classOptions}
            value={vehicleClass}
            onChange={onChangeClass}
            scrollable
          />
        </Card>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} activeOpacity={0.9}>
          <Text style={styles.primaryBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: '700',
    color: theme.primaryDark,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    marginBottom: 16,
  },
  label: {
    color: theme.sub,
    fontSize: 13,
    marginBottom: 6,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: theme.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFF',
  },
  chipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipText: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFF',
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProfileScreen;
