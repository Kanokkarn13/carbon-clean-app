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
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { pickUser, saveUser, updateUser, uploadProfileImage } from '../services/authService';
import { emissionData } from '../hooks/calculateEmission';

const theme = {
  primary: '#22C55E',
  primaryDark: '#16A34A',
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

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
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
  const content = options.map((opt) => (
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

const ProfileEdit = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = (route.params as { user: any }) || {};

  const [profileUri, setProfileUri] = useState<string | null>(user.profile_picture || null);
  const [fname, setFname] = useState(String(user.fname || ''));
  const [lname, setLname] = useState(String(user.lname || ''));
  const [email, setEmail] = useState(String(user.email || ''));
  const [phone, setPhone] = useState(String(user.phone || ''));
  const [houseMember, setHouseMember] = useState(String(user.house_member || ''));

  const [vehicleType, setVehicleType] = useState<(typeof VEHICLE_TYPES)[number]>('Cars');
  const [fuelType, setFuelType] = useState<(typeof FUEL_TYPES)[number]>('Petrol');
  const [vehicleClass, setVehicleClass] = useState<string>('Small car');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof user.vehicle === 'string' && user.vehicle.includes(',')) {
      const [type, fuel, size] = user.vehicle.split(',');
      if (type) setVehicleType(type as any);
      if (fuel) setFuelType(fuel as any);
      if (size) setVehicleClass(type === 'Cars' ? `${size} car` : size);
    }
  }, [user.vehicle]);

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

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        const msg = perm.canAskAgain
          ? 'Please allow photo library access to change your picture.'
          : 'Photo access is blocked. Enable it in Settings to change your picture.';
        Alert.alert('Permission needed', msg);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        // Some clients require lowercase string enums; use raw value for compatibility.
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset?.uri) {
        setProfileUri(asset.uri);
      } else {
        Alert.alert('No image selected', 'Please choose an image to use as your profile picture.');
      }
    } catch (err) {
      console.error('Image picker error', err);
      Alert.alert('Image picker error', 'Could not open the photo library. Please try again.');
    }
  };

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

    setSaving(true);
    try {
      let latestUser = { ...user, profile_picture: profileUri ?? null };

      if (profileUri && profileUri !== user.profile_picture) {
        try {
          const uploaded = await uploadProfileImage(user.user_id, profileUri);
          const updatedUser = uploaded?.data?.user;
          const uploadedUrl = uploaded?.data?.url;
          latestUser = updatedUser || { ...latestUser, profile_picture: uploadedUrl || profileUri };
        } catch (err: any) {
          console.error('❌ Failed to upload image', err);
          Alert.alert(
            'Upload failed',
            `${err?.message || err || 'Could not upload photo'}`,
          );
          setSaving(false);
          return;
        }
      }

      const updatedResp = await updateUser(userData);
      const updatedUser = pickUser(updatedResp);
      const mergedUser = { ...(latestUser || user), ...(updatedUser || {}) };

      if (mergedUser) {
        await saveUser(mergedUser);
      }

      Alert.alert('✅ Success', 'Profile updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('❌ Failed to update user:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* (Removed custom header to avoid double back button) */}

        <View style={{ height: 8 }} />

        {/* Avatar */}
        <Card title="Your Info" icon="person-circle-outline">
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.85} style={styles.avatarWrap}>
            <Image
              source={{
                uri:
                  profileUri ||
                  'https://preview.redd.it/help-me-find-instagram-account-of-this-cat-he-she-looks-so-v0-twu4der3mpud1.jpg?width=640&crop=smart&auto=webp&s=e50ba618c5b563dc1dc37dc98e6fb8c29276dafd',
              }}
              style={styles.avatar}
            />
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" color="#fff" size={16} />
            </View>
          </TouchableOpacity>
          <Text style={styles.helperText}>Tap to change your profile picture</Text>
          <LabeledInput label="First Name" value={fname} onChangeText={setFname} placeholder="First name" />
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

        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// =============================
// Styles
// =============================
const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 44 },
  // header removed

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
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: theme.primary,
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarWrap: { alignSelf: 'center', marginBottom: 6 },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: theme.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.card,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  helperText: {
    fontSize: 12,
    color: theme.sub,
    textAlign: 'center',
    marginBottom: 4,
  },
  label: { color: theme.sub, fontSize: 13, marginBottom: 6 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  chipText: { color: theme.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFF' },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default ProfileEdit;
