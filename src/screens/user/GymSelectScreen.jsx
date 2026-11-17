import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { selectGym, getGymMatches } from '../../api/services/attendanceService';
import { getReadableError } from '../../utils/apiError';

const PURPLE = '#9333ea';

/**
 * Shown when phone matches members at more than one gym.
 */
const GymSelectScreen = () => {
  const { gymMatches, completeGymChoice, refreshGymLink, logout } = useAuth();
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [list, setList] = useState(gymMatches || []);
  const [refreshing, setRefreshing] = useState(false);

  const options = useMemo(
    () => (Array.isArray(list) && list.length ? list : gymMatches || []),
    [list, gymMatches]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const matches = await getGymMatches();
      setList(matches);
      const result = await refreshGymLink();
      if (result?.linked) {
        completeGymChoice(result);
      } else if (Array.isArray(result?.matches)) {
        setList(result.matches);
      }
    } catch (err) {
      setError(getReadableError(err));
    } finally {
      setRefreshing(false);
    }
  };

  const onSelect = async (match) => {
    setLoadingId(`${match.gymId}:${match.memberId}`);
    setError('');
    try {
      const result = await selectGym({
        gymId: match.gymId,
        memberId: match.memberId,
      });
      if (!result?.linked) {
        setError(result?.error || 'Could not sync this gym');
        return;
      }
      completeGymChoice(result);
    } catch (err) {
      setError(getReadableError(err));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Choose your gym</Text>
        <Text style={styles.subtitle}>
          Your phone is registered at more than one gym. Pick which one to sync
          for attendance and streaks.
        </Text>

        {options.length === 0 ? (
          <Text style={styles.empty}>No gym matches found yet.</Text>
        ) : (
          options.map((m) => {
            const key = `${m.gymId}:${m.memberId}`;
            const busy = loadingId === key;
            return (
              <TouchableOpacity
                key={key}
                style={styles.card}
                onPress={() => onSelect(m)}
                disabled={Boolean(loadingId)}
                activeOpacity={0.85}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="business" size={22} color={PURPLE} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.gymName}>
                    {m.gymName || 'Gym'}
                  </Text>
                  <Text style={styles.memberName}>
                    {m.name || 'Member'} · {m.phone || ''}
                  </Text>
                </View>
                {busy ? (
                  <ActivityIndicator color={PURPLE} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                )}
              </TouchableOpacity>
            );
          })
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.secondary}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color={PURPLE} />
          ) : (
            <Text style={styles.secondaryText}>Refresh matches</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 56, gap: 12, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#64748b', marginBottom: 8 },
  empty: { color: '#94a3b8', marginTop: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  gymName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  memberName: { fontSize: 13, color: '#64748b', marginTop: 2 },
  error: { color: '#B91C1C', fontSize: 13, marginTop: 4 },
  secondary: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: PURPLE, fontWeight: '700' },
  logout: { paddingVertical: 12, alignItems: 'center' },
  logoutText: { color: '#94a3b8', fontWeight: '600' },
});

export default GymSelectScreen;
