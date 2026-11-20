/**
 * Fitsera UI kit — components that reproduce the "Fitness App Redesign" canvas.
 * Ground #F4F4F1, white cards, ink (#111) primary actions, lime (#D4F25A) highlights,
 * Inter Tight throughout.
 */
import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, FONT_FAMILY, radii } from '../../theme/opengym';
import { Icon } from './Icon';

export { Icon };

/* ------------------------------------------------------------------ text */

export const Txt = ({ style, children, ...rest }) => (
  <Text style={[s.txt, style]} {...rest}>
    {children}
  </Text>
);

/* ---------------------------------------------------------------- layout */

/**
 * Scrollable screen on the warm-neutral ground.
 * `tab` screens leave room for the bottom tab bar; `footer` pins a bar (e.g. Continue).
 */
export const Screen = ({
  children,
  header = null,
  footer = null,
  refreshing,
  onRefresh,
  scroll = true,
  contentStyle,
  edges = ['top'],
}) => (
  <SafeAreaView style={s.screen} edges={edges}>
    {header}
    {scroll ? (
      <ScrollView
        style={s.fill}
        contentContainerStyle={[s.content, footer && s.contentWithFooter, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.label} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    ) : (
      <View style={[s.fill, s.content, contentStyle]}>{children}</View>
    )}
    {footer ? <View style={s.footer}>{footer}</View> : null}
  </SafeAreaView>
);

/** Page header: small date/eyebrow line over a 28px title, optional round action. */
export const PageTitle = ({ eyebrow, title, action }) => (
  <View style={s.pageTitle}>
    <View style={s.pageTitleText}>
      {eyebrow ? <Txt style={s.eyebrow}>{eyebrow}</Txt> : null}
      <Txt style={s.h1} accessibilityRole="header">
        {title}
      </Txt>
    </View>
    {action}
  </View>
);

/** Large heading + description used on setup / settings pages. */
export const Heading = ({ title, subtitle }) => (
  <View style={s.heading}>
    <Txt style={s.h1Large} accessibilityRole="header">
      {title}
    </Txt>
    {subtitle ? <Txt style={s.headingSub}>{subtitle}</Txt> : null}
  </View>
);

/** Back / close button, centred title, optional right slot. */
export const TopBar = ({ onBack, icon = 'back', title, right, backLabel = 'Back' }) => (
  <View style={s.topBar}>
    {onBack ? (
      <RoundButton icon={icon} onPress={onBack} label={backLabel} />
    ) : (
      <View style={s.topBarSpacer} />
    )}
    {title ? <Txt style={s.topBarTitle}>{title}</Txt> : <View />}
    {right || <View style={s.topBarSpacer} />}
  </View>
);

/** Setup flow header: back, segmented progress, "n / total". */
export const StepHeader = ({ step, total = 4, onBack }) => (
  <View style={[s.topBar, { gap: 16 }]}>
    {onBack ? <RoundButton icon="back" onPress={onBack} label="Back" /> : <View style={s.topBarSpacer} />}
    <View
      style={s.stepBars}
      accessible
      accessibilityLabel={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.stepBar, { backgroundColor: i < step ? colors.ink : colors.bar }]} />
      ))}
    </View>
    <Txt style={s.stepCount}>
      {step} / {total}
    </Txt>
  </View>
);

/* ------------------------------------------------------------- surfaces */

export const Card = ({ children, style, onPress, padding = 20, radius = radii.xl, tone = 'white' }) => {
  const bg = tone === 'ink' ? colors.ink : tone === 'lime' ? colors.lime : colors.surface;
  const body = [s.card, { padding, borderRadius: radius, backgroundColor: bg }, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [body, pressed && s.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={body}>{children}</View>;
};

/** White rounded list container; children are <ListRow>s. */
export const ListCard = ({ children, style }) => <View style={[s.listCard, style]}>{children}</View>;

export const ListRow = ({ title, subtitle, left, right, value, chevron, onPress, last, danger, children }) => {
  const content = (
    <>
      {left}
      <View style={s.rowText}>
        {title ? <Txt style={[s.rowTitle, danger && { color: colors.red }]}>{title}</Txt> : null}
        {subtitle ? <Txt style={s.rowSub}>{subtitle}</Txt> : null}
        {children}
      </View>
      {value != null && value !== '' ? <Txt style={s.rowValue}>{value}</Txt> : null}
      {right}
      {chevron ? <Icon name="chevron" size={18} color={colors.label3} strokeWidth={2} /> : null}
    </>
  );
  const style = [s.row, !last && s.rowBorder];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [style, pressed && s.pressed]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={style}>{content}</View>;
};

/** 40×40 rounded icon tile used at the start of rows. */
export const IconTile = ({ name, size = 40, bg = colors.surface2, color = colors.label }) => (
  <View style={[s.iconTile, { width: size, height: size, backgroundColor: bg }]}>
    <Icon name={name} size={20} color={color} />
  </View>
);

export const Section = ({ title, children, style }) => (
  <View style={[s.section, style]}>
    {title ? <Txt style={s.sectionTitle}>{title}</Txt> : null}
    {children}
  </View>
);

/** Small metric tile: label over a 20px value with optional unit. */
export const StatTile = ({ label, value, unit, tone = 'white', size = 20 }) => (
  <View style={[s.statTile, tone === 'lime' && { backgroundColor: colors.lime }]}>
    <Txt style={[s.statLabel, tone === 'lime' && { color: colors.limeDeep }]}>{label}</Txt>
    <Txt style={[s.statValue, { fontSize: size }]}>
      {value}
      {unit ? <Txt style={[s.statUnit, tone === 'lime' && { color: colors.label }]}> {unit}</Txt> : null}
    </Txt>
  </View>
);

/* --------------------------------------------------------------- controls */

export const RoundButton = ({ icon, onPress, label, size = 44, bg = colors.surface, color = colors.label, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={6}
    style={({ pressed }) => [
      s.round,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      (pressed || disabled) && s.pressed,
    ]}
  >
    <Icon name={icon} size={size > 40 ? 20 : 18} color={color} strokeWidth={icon === 'plus' || icon === 'minus' ? 2 : 1.75} />
  </Pressable>
);

/** 56px action. variant: primary (ink) | secondary (white) | ghost | lime | dashed | danger */
export const Button = ({ title, onPress, variant = 'primary', icon, loading, disabled, style, height = 56 }) => {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        s.button,
        { height, backgroundColor: v.bg, borderRadius: height >= 56 ? 18 : 16 },
        v.border && { borderWidth: 1, borderColor: colors.ring, borderStyle: v.border },
        pressed && !off && { opacity: 0.85 },
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={v.fg} strokeWidth={2} /> : null}
          <Txt style={[s.buttonLabel, { color: v.fg, fontSize: height >= 56 ? 16 : 14 }]}>{title}</Txt>
        </>
      )}
    </Pressable>
  );
};

const BUTTON_VARIANTS = {
  primary: { bg: colors.ink, fg: colors.onInk },
  secondary: { bg: colors.surface, fg: colors.label },
  ghost: { bg: 'transparent', fg: colors.label },
  lime: { bg: colors.lime, fg: colors.onLime },
  dashed: { bg: 'transparent', fg: colors.label, border: 'dashed' },
  danger: { bg: 'transparent', fg: colors.red },
};

/** Lime (or ink) pill badge. */
export const Pill = ({ children, tone = 'lime', style }) => (
  <View style={[s.pill, tone === 'ink' && { backgroundColor: colors.ink }, style]}>
    <Txt style={[s.pillText, tone === 'ink' && { color: colors.onInk }]}>{children}</Txt>
  </View>
);

/** Small pill CTA (e.g. "Start" on a row). */
export const PillButton = ({ title, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.pill, s.pillBtn, pressed && s.pressed]}>
    <Txt style={s.pillText}>{title}</Txt>
  </Pressable>
);

export const ProgressBar = ({ value = 0, height = 4, track = colors.surface3, fill = colors.ink, style }) => (
  <View style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}>
    <View
      style={{
        width: `${Math.max(0, Math.min(1, value)) * 100}%`,
        height,
        borderRadius: height / 2,
        backgroundColor: fill,
      }}
    />
  </View>
);

/** − value + control with 44px round buttons. */
export const Stepper = ({ value, onDecrease, onIncrease, minWidth = 64, label = 'value' }) => (
  <View style={s.stepper}>
    <RoundButton icon="minus" onPress={onDecrease} label={`Decrease ${label}`} bg={colors.surface2} />
    <Txt style={[s.stepperValue, { minWidth }]}>{value}</Txt>
    <RoundButton icon="plus" onPress={onIncrease} label={`Increase ${label}`} bg={colors.surface2} />
  </View>
);

/** 52×32 switch, ink when on. */
export const Switch = ({ value, onChange, label }) => (
  <Pressable
    onPress={() => onChange?.(!value)}
    accessibilityRole="switch"
    accessibilityState={{ checked: !!value }}
    accessibilityLabel={label}
    hitSlop={6}
    style={[s.switch, { backgroundColor: value ? colors.ink : colors.ring, alignItems: value ? 'flex-end' : 'flex-start' }]}
  >
    <View style={s.switchKnob} />
  </Pressable>
);

/** Pill segmented control. `inset` = grey track (inside white cards), else white track. */
export const Segmented = ({ options, value, onChange, inset = false, size = 'sm', stretch = false }) => (
  <View
    accessibilityRole="tablist"
    style={[
      s.segmented,
      { backgroundColor: inset ? colors.surface2 : colors.surface, padding: size === 'lg' ? 4 : 3 },
      stretch && { flexDirection: 'row', alignSelf: 'stretch' },
    ]}
  >
    {options.map((o) => {
      const on = o.value === value;
      return (
        <Pressable
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: on }}
          style={[
            s.segment,
            size === 'lg' ? { height: 40 } : { height: 32, paddingHorizontal: 14 },
            stretch && { flex: 1 },
            on && { backgroundColor: colors.ink },
          ]}
        >
          <Txt style={[s.segmentLabel, { color: on ? colors.onInk : colors.label2, fontSize: size === 'lg' ? 14 : 12 }]}>
            {o.label}
          </Txt>
        </Pressable>
      );
    })}
  </View>
);

/** Grid of choice buttons — selected is ink. */
export const ChoiceGrid = ({ options, value, onChange, columns = 2, height = 56, inset = false }) => (
  <View style={s.choiceGrid}>
    {options.map((o) => {
      const on = o.value === value;
      return (
        <Pressable
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          style={[
            s.choice,
            {
              height,
              width: `${100 / columns - 2.2}%`,
              borderRadius: height >= 56 ? 16 : height >= 48 ? 14 : 12,
              backgroundColor: on ? colors.ink : inset ? colors.surface2 : colors.surface,
            },
          ]}
        >
          <Txt style={[s.choiceLabel, { color: on ? colors.onInk : colors.label, fontSize: height >= 48 ? 15 : 14 }]}>
            {o.label}
          </Txt>
        </Pressable>
      );
    })}
  </View>
);

/** Radio list inside a white list card. */
export const RadioList = ({ options, value, onChange }) => (
  <ListCard>
    {options.map((o, i) => {
      const on = o.value === value;
      return (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="radio"
          accessibilityState={{ checked: on }}
          style={[s.row, i < options.length - 1 && s.rowBorder, { paddingVertical: 14 }]}
        >
          <View style={s.rowText}>
            <Txt style={s.rowTitle}>{o.label}</Txt>
            {o.sub ? <Txt style={s.rowSub}>{o.sub}</Txt> : null}
          </View>
          <View style={[s.radio, { borderColor: on ? colors.ink : colors.ring }]}>
            {on ? <View style={s.radioDot} /> : null}
          </View>
        </Pressable>
      );
    })}
  </ListCard>
);

/** Labelled 56px white input. */
export const Field = forwardRef(({ label, error, style, inputStyle, ...rest }, ref) => (
  <View style={[s.field, style]}>
    {label ? <Txt style={s.fieldLabel}>{label}</Txt> : null}
    <TextInput
      ref={ref}
      placeholderTextColor={colors.label3}
      style={[s.input, error && { borderWidth: 1, borderColor: colors.red }, inputStyle]}
      {...rest}
    />
    {error ? <Txt style={s.fieldError}>{error}</Txt> : null}
  </View>
));
Field.displayName = 'Field';

/** Pressable that looks like a Field (for date pickers etc). */
export const FieldButton = ({ label, value, placeholder, onPress }) => (
  <View style={s.field}>
    {label ? <Txt style={s.fieldLabel}>{label}</Txt> : null}
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.input, s.fieldBtn, pressed && s.pressed]}>
      <Txt style={{ fontSize: 16, color: value ? colors.label : colors.label3 }}>{value || placeholder}</Txt>
    </Pressable>
  </View>
);

/** 7 rounded bars; the last (today) is ink. values are 0..1. */
export const WeekBars = ({ values, labels, height = 96, gap = 12 }) => (
  <View>
    <View style={[s.bars, { height, gap }]}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(6, Math.round(height * Math.max(0, Math.min(1, v)))),
            borderRadius: 8,
            backgroundColor: i === values.length - 1 ? colors.ink : colors.bar,
          }}
        />
      ))}
    </View>
    {labels ? (
      <View style={[s.barLabels, { gap }]}>
        {labels.map((l, i) => (
          <Txt
            key={i}
            style={[s.barLabel, i === labels.length - 1 && { color: colors.label, fontWeight: '600' }]}
          >
            {l}
          </Txt>
        ))}
      </View>
    ) : null}
  </View>
);

export const Loading = () => (
  <View style={s.loading}>
    <ActivityIndicator color={colors.label} />
  </View>
);

export const ErrorBox = ({ message }) =>
  message ? (
    <View style={s.errorBox} accessibilityLiveRegion="polite">
      <Icon name="info" size={18} color={colors.red} />
      <Txt style={s.errorText}>{message}</Txt>
    </View>
  ) : null;

/* ---------------------------------------------------------------- styles */

const s = StyleSheet.create({
  txt: { fontFamily: FONT_FAMILY, color: colors.label },
  screen: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
  contentWithFooter: { paddingBottom: 120 },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 32 },
  pressed: { opacity: 0.7 },

  pageTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  pageTitleText: { gap: 2, flexShrink: 1 },
  eyebrow: { fontSize: 14, color: colors.label2 },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.56 },
  heading: { gap: 6, paddingHorizontal: 4 },
  h1Large: { fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -0.64 },
  headingSub: { fontSize: 15, lineHeight: 22, color: colors.label2 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topBarSpacer: { width: 44, height: 44 },
  topBarTitle: { fontSize: 16, fontWeight: '600' },
  stepBars: { flex: 1, flexDirection: 'row', gap: 6 },
  stepBar: { flex: 1, height: 4, borderRadius: 2 },
  stepCount: { fontSize: 13, color: colors.label2 },

  card: { gap: 0 },
  listCard: { backgroundColor: colors.surface, borderRadius: radii.card, paddingHorizontal: 18, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.sep },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, color: colors.label2 },
  rowValue: { fontSize: 14, color: colors.label2 },
  iconTile: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  section: { gap: 10 },
  sectionTitle: { marginHorizontal: 4, fontSize: 13, fontWeight: '600', color: colors.label2 },

  statTile: { flex: 1, padding: 16, borderRadius: radii.tile, backgroundColor: colors.surface, gap: 4 },
  statLabel: { fontSize: 12, color: colors.label2 },
  statValue: { fontWeight: '600' },
  statUnit: { fontSize: 13, fontWeight: '500', color: colors.label2 },

  round: { alignItems: 'center', justifyContent: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  buttonLabel: { fontWeight: '600' },
  pill: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: colors.lime },
  pillBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.onLime },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperValue: { textAlign: 'center', fontSize: 17, fontWeight: '600' },
  switch: { width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  switchKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface },
  segmented: { flexDirection: 'row', borderRadius: radii.pill, alignSelf: 'flex-start' },
  segment: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontWeight: '600' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  choice: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  choiceLabel: { fontWeight: '600', textAlign: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },

  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.label2, paddingHorizontal: 4 },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.label,
    fontFamily: FONT_FAMILY,
  },
  fieldBtn: { justifyContent: 'center' },
  fieldError: { fontSize: 12, color: colors.red, paddingHorizontal: 4 },

  bars: { flexDirection: 'row', alignItems: 'flex-end' },
  barLabels: { flexDirection: 'row', marginTop: 8 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.label2 },

  loading: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.redSoft,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.red },
});
