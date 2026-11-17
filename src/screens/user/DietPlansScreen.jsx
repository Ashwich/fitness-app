import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import {
  getSuggestedDiets,
  selectDietTemplate,
} from '../../api/services/dietService';
import { getReadableError } from '../../utils/apiError';
import { colors, radii, space, typography } from '../../theme/opengym';

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
];

const QUICK_ACTIONS = [
  { key: 'log', label: 'Log Meal', icon: 'nutrition', color: '#30d158', bg: 'rgba(48,209,88,0.18)' },
  { key: 'stats', label: 'View Stats', icon: 'stats-chart', color: '#ff9f0a', bg: 'rgba(255,159,10,0.18)' },
  { key: 'saved', label: 'Saved', icon: 'bookmark', color: '#bf5af2', bg: 'rgba(191,90,242,0.18)' },
  { key: 'scan', label: 'Scan Food', icon: 'scan', color: '#0a84ff', bg: 'rgba(10,132,255,0.18)' },
];

const DietPlansScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selecting, setSelecting] = useState(null);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await getSuggestedDiets();
      setData(result);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDiary = () => navigation.navigate('NutritionDiaryScreen');

  const handleSelect = async (templateId) => {
    setSelecting(templateId);
    try {
      await selectDietTemplate(templateId);
      Alert.alert('Diet selected', 'Your meal plan is now active.');
      await load();
    } catch (error) {
      Alert.alert('Could not select', getReadableError(error));
    } finally {
      setSelecting(null);
    }
  };

  const onQuick = (key) => {
    if (key === 'log' || key === 'stats' || key === 'scan') {
      openDiary();
      return;
    }
    Alert.alert('Saved plans', 'Your selected meal plans appear below.');
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

  const templates = data?.templates || [];
  const trainerPlan = data?.trainerPlan;
  const selectedId = data?.selectedDietTemplateId;
  const dietType = data?.dietType || 'VEG';

  return (
    <ScreenContainer noPadding>
      <View style={styles.hdr}>
        <View style={{ flex: 1 }}>
          <Text style={styles.largeTitle}>Diet</Text>
          <Text style={styles.sub}>Fuel your better self</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={openDiary}>
          <Ionicons name="book-outline" size={20} color={colors.label} />
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
        <LinearGradient
          colors={['#34c759', '#248a3d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.heroTitle}>
              Good food{'\n'}Better progress
            </Text>
            <Text style={styles.heroSub}>
              Track meals, hit macros, and stay consistent.
            </Text>
            <TouchableOpacity style={styles.heroCta} onPress={openDiary} activeOpacity={0.9}>
              <Text style={styles.heroCtaText}>Open Food Diary</Text>
              <Ionicons name="arrow-forward" size={14} color="#000" />
            </TouchableOpacity>
          </View>
          <Image
            source={{ uri: FOOD_IMAGES[0] }}
            style={styles.heroImg}
          />
        </LinearGradient>

        <View style={styles.sectHead}>
          <Text style={styles.sectLabel}>Meal plans</Text>
          <Text style={styles.viewAll}>View all</Text>
        </View>

        <TouchableOpacity style={styles.planRow} activeOpacity={0.85}>
          <View style={styles.planIcon}>
            <Ionicons name="restaurant" size={18} color={colors.onAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>Personalized Plans</Text>
            <Text style={styles.planSub}>Diet templates for your goal</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.label3} />
        </TouchableOpacity>

        {trainerPlan ? (
          <View style={styles.trainerCard}>
            <Text style={styles.trainerBadge}>Trainer plan</Text>
            <Text style={styles.planTitle}>{trainerPlan.title || 'Assigned diet'}</Text>
            {trainerPlan.description ? (
              <Text style={styles.planSub}>{trainerPlan.description}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectHead}>
          <Text style={styles.sectLabel}>Suggested for {dietType}</Text>
          <Text style={styles.viewAll}>View all</Text>
        </View>

        {templates.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={32} color={colors.label3} />
            <Text style={styles.emptyText}>No diet templates yet for your type.</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {templates.map((tpl, idx) => {
              const isSelected = selectedId === tpl.id;
              return (
                <TouchableOpacity
                  key={tpl.id}
                  style={[styles.suggestCard, isSelected && styles.suggestSelected]}
                  onPress={() => handleSelect(tpl.id)}
                  disabled={!!selecting}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: FOOD_IMAGES[idx % FOOD_IMAGES.length] }}
                    style={styles.suggestImg}
                  />
                  <Text style={styles.suggestTitle} numberOfLines={2}>
                    {tpl.name}
                  </Text>
                  <Text style={styles.suggestMeta}>
                    {tpl.calorieTarget
                      ? `${Number(tpl.calorieTarget).toLocaleString()} kcal/day`
                      : isSelected
                        ? 'Selected'
                        : 'Tap to select'}
                  </Text>
                  {selecting === tpl.id ? (
                    <ActivityIndicator color={colors.accent} style={{ marginTop: 6 }} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={[styles.sectLabel, { marginTop: 8 }]}>Quick actions</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={styles.quickTile}
              onPress={() => onQuick(a.key)}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 28 }} />
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
    paddingTop: 52,
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
  content: { paddingHorizontal: space.pad, gap: 14, paddingBottom: 24 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 18,
    minHeight: 148,
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    marginBottom: 14,
    lineHeight: 18,
  },
  heroCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  heroCtaText: { color: '#000', fontWeight: '700', fontSize: 13 },
  heroImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sectHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.label3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  viewAll: { fontSize: 13, fontWeight: '600', color: colors.accent },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 14,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { fontSize: 16, fontWeight: '600', color: colors.label },
  planSub: { fontSize: 13, color: colors.label2, marginTop: 2 },
  trainerCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.card,
    padding: 14,
    gap: 4,
  },
  trainerBadge: {
    alignSelf: 'flex-start',
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hScroll: { gap: 12, paddingRight: 8 },
  suggestCard: {
    width: 156,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 12,
  },
  suggestSelected: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  suggestImg: {
    width: '100%',
    height: 88,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: colors.surface2,
  },
  suggestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.label,
    minHeight: 36,
  },
  suggestMeta: { fontSize: 12, color: colors.label2, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { color: colors.label3, textAlign: 'center' },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 13, fontWeight: '600', color: colors.label },
});

export default DietPlansScreen;
