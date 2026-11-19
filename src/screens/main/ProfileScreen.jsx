import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Card,
  Icon,
  ListCard,
  ListRow,
  PageTitle,
  RoundButton,
  Screen,
  StatTile,
  Txt,
} from '../../components/ui';
import { colors, radii } from '../../theme/opengym';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../api/services/profileService';
import { getStepsGoal } from '../../services/healthService';
import { getWaterGoal } from '../../services/waterIntakeService';
import { getProfilePhoto, pickProfilePhoto } from '../../services/profilePhotoService';
import { getActivityMap, MONTHS_LONG, MONTHS_SHORT } from '../../services/activityCalendarService';
import { toLocalISODate } from '../../utils/date';
import { bmiOf, calorieGoalsOf, fmt, goalLabel, primaryGoalOf } from '../../utils/profileTargets';
import { kgToLb, useUnits } from '../../services/unitsService';
import { streakFrom } from './TodayScreen';

const SHADES = [colors.surface3, colors.ring, colors.label3, colors.ink];
const WEEKS = 18;
const GAP = 4;
const shade = (lvl) => SHADES[Math.max(0, Math.min(3, lvl || 0))];

/** Monday-first date helpers. */
const mondayOf = (d) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

function Heatmap({ map }) {
  const [w, setW] = useState(0);
  const cell = w ? Math.floor((w - GAP * (WEEKS - 1)) / WEEKS) : 14;
  const { columns, months, active } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = mondayOf(today);
    start.setDate(start.getDate() - 7 * (WEEKS - 1));
    const cols = [];
    const monthLabels = [];
    let count = 0;
    for (let c = 0; c < WEEKS; c++) {
      const col = [];
      for (let r = 0; r < 7; r++) {
        const d = new Date(start);
        d.setDate(start.getDate() + c * 7 + r);
        if (d > today) {
          col.push(null);
          continue;
        }
        const lvl = map[toLocalISODate(d)]?.level || 0;
        if (lvl > 0) count += 1;
        col.push(lvl);
      }
      cols.push(col);
      const first = new Date(start);
      first.setDate(start.getDate() + c * 7);
      const m = MONTHS_SHORT[first.getMonth()];
      if (!monthLabels.includes(m)) monthLabels.push(m);
    }
    return { columns: cols, months: monthLabels, active: count };
  }, [map]);

  return (
    <Card style={{ gap: 14 }}>
      <View style={styles.cardHead}>
        <Txt style={styles.cardTitle}>Consistency</Txt>
        <Txt style={styles.meta}>{active} active days</Txt>
      </View>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={styles.heat}
        accessible
        accessibilityLabel={`Activity over the last ${WEEKS} weeks: ${active} active days`}
      >
        {columns.map((col, c) => (
          <View key={c} style={{ gap: GAP }}>
            {col.map((lvl, r) => (
              <View
                key={r}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 4,
                  backgroundColor: lvl == null ? 'transparent' : shade(lvl),
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.monthRow}>
        {months.map((m) => (
          <Txt key={m} style={styles.meta12}>
            {m}
          </Txt>
        ))}
      </View>
    </Card>
  );
}

function MonthCalendar({ map }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const todayIso = toLocalISODate(now);
  const first = new Date(cursor.y, cursor.m, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const daysIn = new Date(cursor.y, cursor.m + 1, 0).getDate();
  let activeCount = 0;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) {
    const iso = toLocalISODate(new Date(cursor.y, cursor.m, d, 12));
    const on = map[iso]?.level > 0;
    if (on) activeCount += 1;
    cells.push({ d, iso, on, today: iso === todayIso, future: iso > todayIso });
  }
  const isCurrent = cursor.y === now.getFullYear() && cursor.m === now.getMonth();
  const shift = (delta) =>
    setCursor(({ y, m }) => {
      const t = new Date(y, m + delta, 1);
      return { y: t.getFullYear(), m: t.getMonth() };
    });

  return (
    <Card style={{ gap: 14 }}>
      <View style={styles.cardHead}>
        <RoundButton icon="back" label="Previous month" bg={colors.surface2} onPress={() => shift(-1)} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt style={styles.cardTitle}>
            {MONTHS_LONG[cursor.m]} {cursor.y}
          </Txt>
          <Txt style={styles.meta12}>
            {activeCount} active {activeCount === 1 ? 'day' : 'days'}
          </Txt>
        </View>
        <RoundButton
          icon="chevron"
          label="Next month"
          bg={colors.surface2}
          disabled={isCurrent}
          onPress={() => !isCurrent && shift(1)}
        />
      </View>
      <View style={styles.weekdays}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
          <Txt key={i} style={[styles.meta12, styles.weekday]}>
            {l}
          </Txt>
        ))}
      </View>
      <View style={styles.days}>
        {cells.map((c, i) => (
          <View key={i} style={styles.dayCell}>
            {c ? (
              <View
                style={[
                  styles.day,
                  c.on && { backgroundColor: colors.ink },
                  c.today && { backgroundColor: colors.lime, borderWidth: 1.5, borderColor: colors.ink },
                ]}
              >
                <Txt
                  style={[
                    styles.dayText,
                    c.on && !c.today && { color: colors.onInk, fontWeight: '600' },
                    c.today && { fontWeight: '600' },
                    c.future && { color: colors.label4 },
                  ]}
                >
                  {c.d}
                </Txt>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const units = useUnits();
  const [profile, setProfile] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [map, setMap] = useState({});
  const [steps, setSteps] = useState(10000);
  const [water, setWater] = useState(3);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, ph, m, s, w] = await Promise.all([
          fetchProfile().catch(() => null),
          getProfilePhoto().catch(() => null),
          getActivityMap().catch(() => ({})),
          getStepsGoal().catch(() => 10000),
          getWaterGoal().catch(() => 3),
        ]);
        setProfile(p);
        setPhoto(p?.avatarUrl || ph);
        setMap(m);
        setSteps(s);
        setWater(w);
      })();
    }, []),
  );

  const changePhoto = async () => {
    const uri = await pickProfilePhoto(true);
    if (uri) setPhoto(uri);
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  const name = profile?.fullName || user?.fullName || user?.username || 'Athlete';
  const goal = goalLabel(primaryGoalOf(profile), 'short');
  const perWeek = Number(profile?.workoutsPerWeek) || null;
  const subtitle = [goal, perWeek ? `${perWeek}× a week` : null].filter(Boolean).join(' · ') || 'Set your goal in Settings';
  const { bmi } = bmiOf(profile);
  const kg = Number(profile?.weightKg) || 0;
  const cg = calorieGoalsOf(profile);
  const streak = streakFrom(map);
  const stepsLabel = steps >= 1000 ? `${Math.round(steps / 100) / 10}k`.replace('.0k', 'k') : String(steps);

  return (
    <Screen>
      <PageTitle
        title="Profile"
        action={<RoundButton icon="sliders" label="Settings" onPress={() => navigation.navigate('Settings')} />}
      />

      <View style={styles.idRow}>
        <View style={styles.avatarWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Txt style={styles.initial}>{name.charAt(0).toUpperCase()}</Txt>
            </View>
          )}
          <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Change photo" style={styles.camera}>
            <Icon name="camera" size={14} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.name} numberOfLines={1}>
            {name}
          </Txt>
          <Txt style={styles.meta14} numberOfLines={1}>
            {subtitle}
          </Txt>
        </View>
        <Pressable
          onPress={() => navigation.navigate('PersonalDetails')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.edit, pressed && { opacity: 0.7 }]}
        >
          <Txt style={styles.editText}>Edit</Txt>
        </Pressable>
      </View>

      <View style={styles.tiles}>
        <StatTile tone="lime" label="Streak" value={streak} unit={streak === 1 ? 'day' : 'days'} size={22} />
        <StatTile label="BMI" value={bmi ? bmi.toFixed(1) : '—'} size={22} />
        <StatTile
          label="Weight"
          value={kg ? (units === 'imperial' ? kgToLb(kg) : Math.round(kg * 10) / 10) : '—'}
          unit={kg ? (units === 'imperial' ? 'lb' : 'kg') : null}
          size={22}
        />
      </View>

      <View style={{ gap: 10 }}>
        <Txt style={styles.section}>Daily targets</Txt>
        <View style={styles.targets}>
          {[
            [cg.calories ? fmt(cg.calories) : '—', 'kcal'],
            [cg.protein ? `${cg.protein} g` : '—', 'protein'],
            [stepsLabel, 'steps'],
            [`${Math.round(water * 10) / 10} L`, 'water'],
          ].map(([v, l], i) => (
            <View key={l} style={[styles.target, i > 0 && styles.targetBorder]}>
              <Txt style={styles.targetValue}>{v}</Txt>
              <Txt style={styles.meta12}>{l}</Txt>
            </View>
          ))}
        </View>
      </View>

      <Heatmap map={map} />
      <MonthCalendar map={map} />

      <ListCard>
        <ListRow title="Edit profile" chevron onPress={() => navigation.navigate('PersonalDetails')} />
        <ListRow title="Log out" danger last onPress={confirmLogout} />
      </ListCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { width: 72, height: 72 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarEmpty: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 26, fontWeight: '600', color: colors.onInk },
  camera: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.bg,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 20, fontWeight: '600' },
  meta14: { fontSize: 14, color: colors.label2 },
  edit: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center' },
  editText: { fontSize: 14, fontWeight: '600' },
  tiles: { flexDirection: 'row', gap: 10 },
  section: { marginHorizontal: 4, fontSize: 13, fontWeight: '600', color: colors.label2 },
  targets: { flexDirection: 'row', paddingVertical: 18, paddingHorizontal: 8, borderRadius: radii.card, backgroundColor: colors.surface },
  target: { flex: 1, alignItems: 'center', gap: 2 },
  targetBorder: { borderLeftWidth: 1, borderLeftColor: colors.sep },
  targetValue: { fontSize: 17, fontWeight: '600' },
  meta: { fontSize: 13, color: colors.label2 },
  meta12: { fontSize: 12, color: colors.label2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  heat: { flexDirection: 'row', justifyContent: 'space-between' },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekdays: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '500' },
});
