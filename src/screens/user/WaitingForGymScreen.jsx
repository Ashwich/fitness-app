import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { getReadableError } from '../../utils/apiError';
import { colors } from '../../theme/opengym';

const PURPLE = colors.accent;

/**
 * Shown after login when the member is not yet linked to a gym.
 */
const WaitingForGymScreen = ({ navigation }) => {
  const { refreshGymLink, dismissGymWait, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const result = await refreshGymLink();
      if (result?.linked) {
        Alert.alert('Connected', result?.gym?.name
          ? `You're linked to ${result.gym.name}.`
          : 'Your gym account is linked.');
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
        }
      } else {
        Alert.alert(
          'Still waiting',
          'Ask your gym to add your phone number as a member, then try again.'
        );
      }
    } catch (error) {
      Alert.alert('Could not link', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    dismissGymWait();
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="fitness" size={40} color={PURPLE} />
        </View>
        <Text style={styles.title}>Waiting for your gym</Text>
        <Text style={styles.body}>
          Ask your gym to add your phone number as a member. Once they do, tap
          Retry below to connect your account.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.disabled]}
          onPress={handleRetry}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={colors.onAccent} />
              <Text style={styles.primaryText}>Retry link</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleContinue}>
          <Text style={styles.secondaryText}>Continue to app</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.label,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.label2,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
  },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    paddingVertical: 12,
  },
  secondaryText: { color: PURPLE, fontWeight: '600', fontSize: 15 },
  logoutBtn: { marginTop: 24 },
  logoutText: { color: colors.label3, fontWeight: '500' },
  disabled: { opacity: 0.7 },
});

export default WaitingForGymScreen;
