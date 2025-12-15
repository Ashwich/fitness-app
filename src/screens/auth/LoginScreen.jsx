import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormTextInput } from '../../components/FormTextInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { getReadableError } from '../../utils/apiError';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!identifier || !password) {
      Alert.alert('Missing fields', 'Please fill in both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      await login({ identifier, password });
    } catch (error) {
      Alert.alert('Login failed', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back 👋</Text>
        <Text style={styles.subtitle}>Log in to manage your workouts and gym memberships.</Text>
      </View>

      <FormTextInput
        label="Username / Email / Phone"
        placeholder="e.g. alex2025 or alex@email.com"
        autoCapitalize="none"
        autoCorrect={false}
        value={identifier}
        onChangeText={setIdentifier}
      />

      <FormTextInput
        label="Password"
        placeholder="********"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <PrimaryButton title="Log in" onPress={handleSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text>New here?</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
          Create an account
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
  },
});

export default LoginScreen;


