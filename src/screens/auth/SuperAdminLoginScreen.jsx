import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { gymOwnerLogin } from '../../api/gymService';

const SuperAdminLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await gymOwnerLogin(normalizedEmail, password);

      if (result.success && result.data) {
        const { gymOwner } = result.data;

        if (!gymOwner) {
          Alert.alert('Login failed', 'Invalid response from server.');
          return;
        }

        if (gymOwner.isSuperAdmin) {
          navigation.navigate('GymSuperAdminDashboard');
        } else {
          navigation.navigate('GymAdminDashboard');
        }
      } else {
        Alert.alert('Login failed', result.message || 'Please check your credentials.');
      }
    } catch (error) {
      Alert.alert('Login error', error.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Super Admin Login</Text>
        <Text style={styles.subtitle}>Same flow as web super-admin-login page.</Text>
      </View>
      <FormTextInput
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <FormTextInput
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <PrimaryButton title="Login as Super Admin" onPress={handleLogin} loading={loading} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
  },
});

export default SuperAdminLoginScreen;


