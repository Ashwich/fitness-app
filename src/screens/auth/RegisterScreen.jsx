import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { getReadableError } from '../../utils/apiError';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password || (!email && !phone)) {
      Alert.alert('Missing information', 'Username, password and email or phone are required.');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting registration with:', { username, email: email || undefined, phone: phone || undefined });
      await register({
        username,
        password,
        email: email || undefined,
        phone: phone || undefined,
      });
      console.log('Registration successful');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = getReadableError(error);
      Alert.alert('Registration failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Sign up to keep track of your progress everywhere.</Text>
      </View>

      <FormTextInput
        label="Username"
        placeholder="alex_fitsera"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <FormTextInput
        label="Email (optional)"
        placeholder="alex@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <FormTextInput
        label="Phone (optional)"
        placeholder="+1 555 123 4567"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <FormTextInput
        label="Password"
        placeholder="********"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <PrimaryButton title="Create account" onPress={handleSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text>Already have an account?</Text>
        <Text style={styles.link} onPress={() => navigation.goBack()}>
          Log in
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
    fontSize: 26,
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

export default RegisterScreen;


