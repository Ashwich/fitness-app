import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import FirebaseAuthButtons from '../../components/auth/FirebaseAuthButtons';
import { colors } from '../../theme/opengym';

const LoginScreen = () => {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          Continue with phone or Google. After Google, you can add your gym phone
          to sync membership — or skip.
        </Text>
      </View>

      <View style={styles.authPrimary}>
        <FirebaseAuthButtons />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.label,
  },
  subtitle: {
    color: colors.label2,
    fontSize: 15,
    lineHeight: 22,
  },
  authPrimary: {
    paddingHorizontal: 20,
  },
});

export default LoginScreen;
