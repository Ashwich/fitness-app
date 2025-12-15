import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';

const GymSignupScreen = () => {
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSignup = () => {
    if (!gymName || !ownerName || (!email && !phone)) {
      Alert.alert('Missing fields', 'Please fill required details for gym signup.');
      return;
    }
    // TODO: wire to gym-management gym registration endpoint
    Alert.alert('Not implemented', 'Gym signup wiring will be added here.');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Gym Signup</Text>
        <Text style={styles.subtitle}>Mobile version of the signup page for new gyms.</Text>
      </View>
      <FormTextInput label="Gym name" value={gymName} onChangeText={setGymName} />
      <FormTextInput label="Owner name" value={ownerName} onChangeText={setOwnerName} />
      <FormTextInput
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <FormTextInput
        label="Phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <PrimaryButton title="Create gym account" onPress={handleSignup} />
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

export default GymSignupScreen;


