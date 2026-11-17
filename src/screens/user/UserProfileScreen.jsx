import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../api/services/profileService';
import { getAttendanceStreaks } from '../../api/services/attendanceService';
import { pickProfilePhoto } from '../../services/profilePhotoService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';
import { getPeriodSettings } from '../../services/periodTrackingService';
import {
  getActivityMap,
  countActiveDays,
  markDayActive,
  todayISO,
} from '../../services/activityCalendarService';
import ActivityHeatmap from '../../components/activity/ActivityHeatmap';
import ActivityMonthCalendar from '../../components/activity/ActivityMonthCalendar';
import { colors, radii, space, typography } from '../../theme/opengym';

const toAbsoluteUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = ENV.USERS_SERVICE_URL.replace('/api/users', '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
};

const UserProfileScreen = ({ navigation, route }) => {
  const { user, logout, refreshUser } = useAuth();
  const paramUserId = route?.params?.userId;
  const selfId = user?.id || user?.userId;
  const userId = paramUserId || selfId;
  const isOwnProfile = !paramUserId || paramUserId === selfId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [periodEnabled, setPeriodEnabled] = useState(false);
  const [activityMap, setActivityMap] = useState({});
  const [activeYearCount, setActiveYearCount] = useState(0);
  const loadingRef = React.useRef(false);
  const userRef = React.useRef(user);
  userRef.current = user;

  const loadStreak = async (uid) => {
    try {
      const streaksRaw = await getAttendanceStreaks(20);
      const list = Array.isArray(streaksRaw)
        ? streaksRaw
        : streaksRaw?.leaderboard || streaksRaw?.streaks || streaksRaw?.items || [];
      const mine =
        list.find(
          (row) => row.userId === uid || row.memberId === uid || row.id === uid
        ) || null;
      const days =
        mine?.streak ??
        mine?.currentStreak ??
        mine?.days ??
        streaksRaw?.currentStreak ??
        0;
      setStreak(Number(days) || 0);
    } catch {
      setStreak(0);
    }
  };

  const loadProfile = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      const currentUser = userRef.current;

      if (isOwnProfile) {
        let profileData = null;
        try {
          profileData = await fetchProfile();
        } catch {
          profileData = null;
        }

        const merged = {
          ...(currentUser || {}),
          ...(profileData || {}),
          id: selfId || currentUser?.id || profileData?.userId,
        };
        setProfile(merged);
        await loadStreak(merged.id);

        try {
          await markDayActive(todayISO(), 1);
          const map = await getActivityMap();
          setActivityMap(map);
          setActiveYearCount(countActiveDays(map, 365));
        } catch {
          setActivityMap({});
        }

        if (merged.gender === 'female') {
          const period = await getPeriodSettings();
          setPeriodEnabled(Boolean(period.enabled));
        } else {
          setPeriodEnabled(false);
        }
      } else if (userId) {
        setProfile({ id: userId });
        await loadStreak(userId);
      } else {
        setProfile(currentUser || {});
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [isOwnProfile, userId, selfId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!cancelled) await loadProfile();
      })();
      return () => {
        cancelled = true;
      };
    }, [loadProfile])
  );

  const handleUploadPhoto = async () => {
    const photo = await pickProfilePhoto();
    if (photo) {
      setProfile((p) => ({ ...p, avatarUrl: photo }));
      await refreshUser?.();
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ScreenContainer>
    );
  }

  const avatarUrl = toAbsoluteUrl(profile?.avatarUrl);
  const displayName = profile?.fullName || profile?.username || 'Athlete';
  const firstName = displayName.split(' ')[0];
  const bmi =
    profile?.bmi != null
      ? Number(profile.bmi).toFixed(1)
      : profile?.weightKg && profile?.heightCm
        ? (profile.weightKg / (profile.heightCm / 100) ** 2).toFixed(1)
        : '—';
  const calories =
    profile?.calorieGoals?.dailyCalories ||
    profile?.calorieGoals?.calories ||
    profile?.macroTargets?.calories ||
    '—';
  const protein = profile?.calorieGoals?.protein || profile?.macroTargets?.proteinG || '—';

  return (
    <ScreenContainer noPadding>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hdr}>
          <View style={{ flex: 1 }}>
            <Text style={styles.largeTitle}>{firstName}</Text>
            <Text style={styles.sub}>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('ProfileSettingsScreen', { profile })}
            >
              <Ionicons name="settings-outline" size={22} color={colors.label} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.avatarRow}>
          <TouchableOpacity
            onPress={isOwnProfile ? handleUploadPhoto : undefined}
            activeOpacity={isOwnProfile ? 0.8 : 1}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPh}>
                <Ionicons name="person" size={36} color={colors.label3} />
              </View>
            )}
            {isOwnProfile ? (
              <View style={styles.camBadge}>
                <Ionicons name="camera" size={12} color={colors.onAccent} />
              </View>
            ) : null}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            {profile?.username ? (
              <Text style={styles.handle}>@{profile.username}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.card, styles.half]}>
            <View style={styles.cardTop}>
              <Ionicons name="flame" size={18} color={colors.orange} />
              <Text style={styles.cardCap}>STREAK</Text>
            </View>
            <Text style={styles.big}>{streak}</Text>
            <Text style={styles.cardFoot}>days</Text>
          </View>
          <View style={[styles.card, styles.half]}>
            <View style={styles.cardTop}>
              <Ionicons name="body-outline" size={18} color={colors.accent} />
              <Text style={styles.cardCap}>BMI</Text>
            </View>
            <Text style={styles.big}>{bmi}</Text>
            <Text style={styles.cardFoot}>body mass</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectTitle}>Daily targets</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{calories}</Text>
              <Text style={styles.macroLbl}>kcal</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{protein}</Text>
              <Text style={styles.macroLbl}>protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>
                {profile?.weightKg != null ? profile.weightKg : '—'}
              </Text>
              <Text style={styles.macroLbl}>kg</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>
                {profile?.heightCm != null ? profile.heightCm : '—'}
              </Text>
              <Text style={styles.macroLbl}>cm</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { marginBottom: space.cardGap }]}>
          <View style={styles.activityHdr}>
            <Text style={styles.sectTitle}>Activity</Text>
            <Text style={styles.activityCount}>
              {activeYearCount} day{activeYearCount === 1 ? '' : 's'} this year
            </Text>
          </View>
          <ActivityHeatmap
            activityMap={activityMap}
            onDayPress={(iso, a) => {
              const src = (a?.sources || []).join(', ') || 'activity';
              Alert.alert(iso, `Active · ${src}`);
            }}
          />
        </View>

        <View style={styles.card}>
          <ActivityMonthCalendar
            activityMap={activityMap}
            onDayPress={(iso, a) => {
              if (a?.level > 0) {
                Alert.alert(iso, 'You were active this day.');
              }
            }}
          />
        </View>

        {isOwnProfile ? (
          <View style={styles.list}>
            <TouchableOpacity
              style={styles.lrow}
              onPress={() => navigation.navigate('ProfileSettingsScreen', { profile })}
            >
              <View style={[styles.lrowIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="create-outline" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lrowTitle}>Edit profile</Text>
                <Text style={styles.lrowSub}>Personal, physical & goals</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.label3} />
            </TouchableOpacity>

            <View style={styles.hair} />

            <TouchableOpacity style={styles.lrow} onPress={handleUploadPhoto}>
              <View style={[styles.lrowIcon, { backgroundColor: 'rgba(10,132,255,0.16)' }]}>
                <Ionicons name="image-outline" size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lrowTitle}>Upload photo</Text>
                <Text style={styles.lrowSub}>Change your avatar</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.label3} />
            </TouchableOpacity>

            {(profile?.gender === 'female' || periodEnabled) && (
              <>
                <View style={styles.hair} />
                <TouchableOpacity
                  style={styles.lrow}
                  onPress={() => navigation.navigate('PeriodTrackingScreen')}
                >
                  <View style={[styles.lrowIcon, { backgroundColor: 'rgba(255,55,95,0.16)' }]}>
                    <Ionicons name="calendar-outline" size={18} color="#ff375f" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lrowTitle}>Period tracking</Text>
                    <Text style={styles.lrowSub}>Cycle & predictions</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.label3} />
                </TouchableOpacity>
              </>
            )}

            <View style={styles.hair} />

            <TouchableOpacity
              style={styles.lrow}
              onPress={() =>
                Alert.alert('Logout', 'Sign out of Fitsera?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Logout', style: 'destructive', onPress: () => logout() },
                ])
              }
            >
              <View style={[styles.lrowIcon, { backgroundColor: 'rgba(255,69,58,0.16)' }]}>
                <Ionicons name="log-out-outline" size={18} color={colors.red} />
              </View>
              <Text style={[styles.lrowTitle, { color: colors.red, flex: 1 }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 48 }} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  content: { flex: 1, backgroundColor: colors.bg },
  hdr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: space.pad,
    paddingTop: 52,
    marginBottom: 18,
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: space.pad,
    marginBottom: 16,
  },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPh: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.headline },
  handle: { ...typography.foot, marginTop: 2 },
  cardRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: space.pad,
    marginBottom: space.cardGap,
  },
  half: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: space.pad,
    marginHorizontal: space.pad,
    marginBottom: space.cardGap,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardCap: { ...typography.cap, letterSpacing: 0.6 },
  big: { fontSize: 30, fontWeight: '600', color: colors.label, letterSpacing: -0.5 },
  cardFoot: { ...typography.foot, marginTop: 2 },
  sectTitle: { ...typography.foot, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  activityHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activityCount: { fontSize: 13, fontWeight: '500', color: colors.accent },
  macroRow: { flexDirection: 'row' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroVal: { fontSize: 17, fontWeight: '600', color: colors.label },
  macroLbl: { ...typography.cap, marginTop: 2 },
  list: {
    marginHorizontal: space.pad,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  lrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  lrowIcon: {
    width: 29,
    height: 29,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lrowTitle: { fontSize: 17, fontWeight: '400', color: colors.label, letterSpacing: -0.2 },
  lrowSub: { ...typography.cap, marginTop: 1 },
  hair: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.sep,
    marginLeft: 55,
  },
});

export default UserProfileScreen;
