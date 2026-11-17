import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import {
  getMyAttendance,
  getAttendanceStreaks,
} from '../../api/services/attendanceService';
import { getReadableError } from '../../utils/apiError';
import { colors, radii, space, typography } from '../../theme/opengym';

const GymHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [myStreak, setMyStreak] = useState(null);

  const load = useCallback(async () => {
    try {
      const [attendanceRaw, streaksRaw] = await Promise.all([
        getMyAttendance().catch(() => null),
        getAttendanceStreaks(20).catch(() => null),
      ]);

      const attendanceList = Array.isArray(attendanceRaw)
        ? attendanceRaw
        : attendanceRaw?.history ||
          attendanceRaw?.records ||
          attendanceRaw?.attendance ||
          attendanceRaw?.items ||
          [];
      setHistory(Array.isArray(attendanceList) ? attendanceList.slice(0, 10) : []);

      const streakList = Array.isArray(streaksRaw)
        ? streaksRaw
        : streaksRaw?.leaderboard || streaksRaw?.streaks || streaksRaw?.items || [];
      const list = Array.isArray(streakList) ? streakList : [];
      setStreaks(list);

      const mineFromList =
        list.find(
          (row) =>
            row.userId === user?.id ||
            row.memberUserId === user?.id ||
            row.isMe ||
            row.me
        ) || null;

      if (mineFromList) {
        setMyStreak(mineFromList);
      } else if (attendanceRaw && typeof attendanceRaw === 'object' && !Array.isArray(attendanceRaw)) {
        setMyStreak({
          currentStreak: attendanceRaw.currentStreak ?? 0,
          days: attendanceRaw.daysPresent ?? attendanceList.length,
        });
      } else {
        setMyStreak(null);
      }
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const myDays = myStreak?.streak ?? myStreak?.currentStreak ?? myStreak?.days ?? history.length;

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <View style={styles.hdr}>
        <View style={{ flex: 1 }}>
          <Text style={styles.largeTitle}>Gym</Text>
          <Text style={styles.sub}>Show up. Be consistent.</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('AttendanceScreen')}
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.label} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('AttendanceScreen')}
        >
          <LinearGradient
            colors={['#34c759', '#248a3d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.qrCard}
          >
            <View style={styles.qrIcon}>
              <Ionicons name="qr-code" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.qrTitle}>Mark attendance</Text>
              <Text style={styles.qrSub}>Scan your gym QR code</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.streakHero}>
          <Text style={styles.streakLabel}>Your streak</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakValue}>{myDays ?? 0}</Text>
            <Ionicons name="flame" size={36} color={colors.orange} style={{ marginLeft: 8 }} />
          </View>
          <Text style={styles.streakUnit}>days · keep showing up</Text>
        </View>

        <View style={styles.sectHead}>
          <Text style={styles.sectTitle}>Member streaks</Text>
          <Text style={styles.viewAll}>View all</Text>
        </View>

        {streaks.length === 0 ? (
          <Text style={styles.emptyText}>No streak data yet. Check in to start climbing.</Text>
        ) : (
          <>
            {(() => {
              const top = streaks[0];
              const topName =
                top?.name || top?.fullName || top?.memberName || top?.username || 'Member';
              const topStreak = top?.streak ?? top?.currentStreak ?? top?.days ?? 0;
              return (
                <View style={styles.longestCard}>
                  <Ionicons name="trophy" size={22} color={colors.orange} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.longestLabel}>Longest streak</Text>
                    <Text style={styles.longestName} numberOfLines={1}>
                      {topName} · {topStreak} days
                    </Text>
                  </View>
                </View>
              );
            })()}

            {streaks.map((row, index) => {
              const name = row.name || row.fullName || row.memberName || row.username || 'Member';
              const avatar = row.avatarUrl || row.avatar || row.photoUrl;
              const streak = row.streak ?? row.currentStreak ?? row.days ?? 0;
              return (
                <View
                  key={row.memberId || row.userId || `${name}-${index}`}
                  style={styles.leaderRow}
                >
                  <Text style={styles.rank}>{index + 1}</Text>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={16} color={colors.accent} />
                    </View>
                  )}
                  <Text style={styles.leaderName} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.streakChip}>
                    <Ionicons name="flame" size={14} color={colors.orange} />
                    <Text style={styles.streakChipText}>{streak}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <Text style={[styles.sectTitle, { marginTop: 12 }]}>Recent check-ins</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No attendance recorded yet.</Text>
        ) : (
          history.map((item, index) => {
            const when =
              item.checkInAt || item.checkedInAt || item.date || item.createdAt || item.timestamp;
            const label = when ? new Date(when).toLocaleString() : `Visit ${index + 1}`;
            return (
              <View key={item.id || label} style={styles.historyRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                <Text style={styles.historyText}>{label}</Text>
              </View>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  hdr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: space.pad,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    marginBottom: 4,
  },
  largeTitle: { ...typography.largeTitle },
  sub: { ...typography.sub, marginTop: 4 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: space.pad, gap: 12, paddingBottom: 24 },
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 18,
  },
  qrIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  qrSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2 },
  streakHero: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 28,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.label3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  streakValue: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.label,
    letterSpacing: -1,
  },
  streakUnit: { fontSize: 14, color: colors.label2, marginTop: 4 },
  sectHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectTitle: { fontSize: 16, fontWeight: '700', color: colors.label },
  viewAll: { fontSize: 13, fontWeight: '600', color: colors.accent },
  emptyText: { color: colors.label3, fontSize: 14 },
  longestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,159,10,0.14)',
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.35)',
  },
  longestLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  longestName: { fontSize: 15, fontWeight: '700', color: colors.label, marginTop: 2 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 12,
  },
  rank: { width: 22, fontWeight: '700', color: colors.label3, fontSize: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.label },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,159,10,0.16)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakChipText: { fontWeight: '700', color: colors.orange, fontSize: 13 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  historyText: { fontSize: 14, color: colors.label2 },
});

export default GymHomeScreen;
