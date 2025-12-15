import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';

const UserPortalLoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!identifier || !password) {
      Alert.alert('Missing fields', 'Please enter username/email and password.');
      return;
    }
    // TODO: wire to the same endpoint as web userLogin page
    Alert.alert('Not implemented', 'User portal login wiring will be added here.');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>User Portal Login</Text>
        <Text style={styles.subtitle}>Mobile version of the web userLogin page.</Text>
      </View>
      <FormTextInput
        label="Username / Email"
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
      <PrimaryButton title="Login to User Portal" onPress={handleLogin} />
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

export default UserPortalLoginScreen;


