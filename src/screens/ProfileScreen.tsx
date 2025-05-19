import React, { useState } from 'react';
import { updateUser } from '../services/authService';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';

type User = {
  user_id: number;
  fname: string;
  lname: string;
  email: string;
  phone: string;
  profile_picture?: string | null;
};

type ProfileScreenProps = {
  route: {
    params: {
      user: User;
    };
  };
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ route }) => {
  const { user } = route.params;

  const [fname, setName] = useState(user.fname);
  const [lname, setLname] = useState(user.lname);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);

  const handleSave = async () => {
    const userData = {
      user_id: user.user_id,
      fname,
      lname,
      email,
      phone,
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
    <View style={styles.container}>
      <View style={styles.inner}>
        <Image
          source={{
            uri:
              user.profile_picture ||
              'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          }}
          style={styles.avatar}
        />

        <TextInput
          style={styles.input}
          value={fname}
          onChangeText={setName}
          placeholder="First Name"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          value={lname}
          onChangeText={setLname}
          placeholder="Last Name"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone"
          keyboardType="phone-pad"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9f5de',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: '#f6fff8',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#0db760',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
