import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Icon,
  ListCard,
  ListRow,
  Loading,
  PageTitle,
  RoundButton,
  Screen,
  Section,
  StatTile,
  Txt,
} from '../../components/ui';
import { colors, radii, FONT_FAMILY } from '../../theme/opengym';
import { useAuth } from '../../context/AuthContext';
import { getAttendanceStreaks, getMyAttendance } from '../../api/services/attendanceService';

const listOf = (raw, keys) => {
  if (Array.isArray(raw)) return raw;
  for (const k of keys) if (Array.isArray(raw?.[k])) return raw[k];
  return [];
};
const nameOf = (r) => r?.name || r?.fullName || r?.memberName || r?.username || 'Member';
const streakOf = (r) => r?.streak ?? r?.currentStreak ?? r?.days ?? 0;
const whenOf = (i) => i?.checkInAt || i?.checkedInAt || i?.date || i?.createdAt || i?.timestamp;

/** Gym tab for linked members: check in, streak, member leaderboard, history. */
export default function GymHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [streaks, setStreaks] = useState([]);
  const [mine, setMine] = useState(0);
  const [gymName, setGymName] = useState(null);

  const load = useCallback(async () => {
    const [att, st] = await Promise.all([
      getMyAttendance().catch(() => null),
      getAttendanceStreaks(20).catch(() => null),
    ]);
    const list = listOf(att, ['history', 'records', 'attendance', 'items']);
    setHistory(list.slice(0, 8));
    setTotal(att?.daysPresent ?? att?.total ?? list.length);
    setGymName(att?.gym?.name || att?.gymName || null);
    const board = listOf(st, ['leaderboard', 'streaks', 'items']);
    setStreaks(board);
    const me = board.find((r) => r.userId === user?.id || r.memberUserId === user?.id || r.isMe || r.me);
    setMine(me ? streakOf(me) : att?.currentStreak ?? 0);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    >
      <PageTitle
        eyebrow={gymName || 'Your gym'}
        title="Gym"
        action={<RoundButton icon="qr" label="Check in" onPress={() => navigation.navigate('AttendanceScreen')} />}
      />

      <Pressable
        onPress={() => navigation.navigate('AttendanceScreen')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.checkin, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.checkinIcon}>
          <Icon name="qr" size={22} color={colors.onLime} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.checkinTitle}>Check in</Txt>
          <Txt style={styles.checkinSub}>Scan the QR code at your gym</Txt>
        </View>
        <Icon name="chevron" size={20} color={colors.onInk} strokeWidth={2} />
      </Pressable>

      <View style={styles.tiles}>
        <StatTile tone="lime" label="Streak" value={mine} unit={mine === 1 ? 'day' : 'days'} size={22} />
        <StatTile label="Visits" value={total} size={22} />
      </View>

      <Section title="Member streaks">
        {streaks.length === 0 ? (
          <ListCard>
            <ListRow title="No streaks yet" subtitle="Check in to start climbing" last />
          </ListCard>
        ) : (
          <ListCard>
            {streaks.slice(0, 10).map((r, i) => {
              const avatar = r.avatarUrl || r.avatar || r.photoUrl;
              const me = r.userId === user?.id || r.memberUserId === user?.id || r.isMe || r.me;
              return (
                <ListRow
                  key={r.memberId || r.userId || `${nameOf(r)}-${i}`}
                  title={me ? `${nameOf(r)} (you)` : nameOf(r)}
                  last={i === Math.min(streaks.length, 10) - 1}
                  left={
                    <View style={styles.rankWrap}>
                      <Txt style={styles.rank}>{i + 1}</Txt>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarEmpty]}>
                          <Txt style={styles.initial}>{nameOf(r).charAt(0).toUpperCase()}</Txt>
                        </View>
                      )}
                    </View>
                  }
                  right={
                    <View style={styles.streakChip}>
                      <Icon name="flame" size={14} />
                      <Txt style={styles.streakText}>{streakOf(r)}</Txt>
                    </View>
                  }
                />
              );
            })}
          </ListCard>
        )}
      </Section>

      <Section title="Recent check-ins">
        <ListCard>
          {history.length === 0 ? (
            <ListRow title="No check-ins yet" subtitle="Your visits will show up here" last />
          ) : (
            history.map((h, i) => {
              const d = whenOf(h) ? new Date(whenOf(h)) : null;
              return (
                <ListRow
                  key={h.id || i}
                  left={<Icon name="check" size={18} strokeWidth={2} />}
                  title={d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : `Visit ${i + 1}`}
                  value={d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null}
                  last={i === history.length - 1}
                />
              );
            })
          )}
        </ListCard>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: radii.card,
    backgroundColor: colors.ink,
  },
  checkinIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinTitle: { fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '600', color: colors.onInk },
  checkinSub: { fontFamily: FONT_FAMILY, fontSize: 13, color: colors.inkMuted },
  tiles: { flexDirection: 'row', gap: 10 },
  rankWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 18, textAlign: 'center', fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '600', color: colors.label2 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarEmpty: { backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '600' },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  streakText: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '600' },
});
