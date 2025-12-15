import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { gymOwnerLogin } from '../../api/gymService';

const GymAdminLoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Missing fields', 'Please enter email/phone and password.');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = identifier.trim().toLowerCase();
      const result = await gymOwnerLogin(normalizedEmail, password);

      if (result.success && result.data) {
        navigation.navigate('GymAdminDashboard');
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
        <Text style={styles.title}>Gym Admin Login</Text>
        <Text style={styles.subtitle}>Same flow as web gymAdminLogin page.</Text>
      </View>
      <FormTextInput
        label="Email / Phone"
        autoCapitalize="none"
        value={identifier}
        onChangeText={setIdentifier}
      />
      <FormTextInput
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <PrimaryButton title="Login as Gym Admin" onPress={handleLogin} loading={loading} />
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

export default GymAdminLoginScreen;


