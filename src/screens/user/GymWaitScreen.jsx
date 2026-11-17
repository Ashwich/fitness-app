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

const PURPLE = '#9333ea';

/** Gym tab placeholder when the member has no linked gym. */
const GymWaitScreen = () => {
  const { refreshGymLink } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const result = await refreshGymLink();
      if (result?.linked) {
        Alert.alert(
          'Connected',
          result?.gym?.name
            ? `You're linked to ${result.gym.name}.`
            : 'Your gym account is linked.'
        );
      } else {
        Alert.alert(
          'Not linked yet',
          'Ask your gym to add your phone number, then retry.'
        );
      }
    } catch (error) {
      Alert.alert('Could not link', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="business-outline" size={36} color={PURPLE} />
        </View>
        <Text style={styles.title}>No gym linked</Text>
        <Text style={styles.body}>
          Ask your gym to add your phone number as a member so you can mark
          attendance and see streaks.
        </Text>
        <TouchableOpacity
          style={[styles.btn, loading && styles.disabled]}
          onPress={handleRetry}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="link" size={18} color="#fff" />
              <Text style={styles.btnText}>Retry link</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 100,
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.7 },
});

export default GymWaitScreen;
