import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radii } from '../../theme/opengym';

const FEATURES = [
  { icon: 'restaurant-outline', label: 'Log meals & calories', tint: colors.orange },
  { icon: 'footsteps-outline', label: 'Steps & water, every day', tint: colors.blue },
  { icon: 'barbell-outline', label: 'Workout plans & exercises', tint: colors.accent },
  { icon: 'qr-code-outline', label: 'Gym attendance & trainer diets', tint: colors.purple },
];

const HomepageScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe}>
    <LinearGradient
      colors={[colors.accentSoft, colors.bg]}
      style={StyleSheet.absoluteFill}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.55 }}
    />
    <View style={styles.hero}>
      <View style={styles.logo}>
        <Ionicons name="pulse" size={44} color={colors.onAccent} />
      </View>
      <Text style={styles.brandTag}>FITSERA</Text>
      <Text style={styles.title}>
        Train smarter.{'\n'}
        <Text style={styles.highlight}>Live stronger.</Text>
      </Text>
      <Text style={styles.subtitle}>
        Your fitness companion, connected to your gym.
      </Text>
    </View>

    <View style={styles.features}>
      {FEATURES.map((f) => (
        <View key={f.label} style={styles.featureRow}>
          <View style={[styles.featureIcon, { backgroundColor: `${f.tint}26` }]}>
            <Ionicons name={f.icon} size={18} color={f.tint} />
          </View>
          <Text style={styles.featureText}>{f.label}</Text>
        </View>
      ))}
    </View>

    <View style={styles.actions}>
      <PrimaryButton title="Get started" onPress={() => navigation.navigate('Login')} />
      <Text style={styles.hint}>Sign in with your phone number or Google.</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radii.xl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  brandTag: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.accent,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.label,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.6,
  },
  highlight: { color: colors.accent },
  subtitle: {
    marginTop: 12,
    color: colors.label2,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    marginHorizontal: 24,
    padding: 16,
    gap: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { color: colors.label, fontSize: 15, fontWeight: '500' },
  actions: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 12 },
  hint: { fontSize: 13, color: colors.label3, textAlign: 'center' },
});

export default HomepageScreen;
