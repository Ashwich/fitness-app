import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/opengym';

const THUMB = 26;

/**
 * Range slider matching the design's ink `accent-color` range input.
 * Fully controlled; supports screen-reader increment/decrement.
 */
export function Slider({ value, min, max, step = 1, onChange, label }) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const startX = useRef(0);
  const cb = useRef({ onChange, min, max, step });
  cb.current = { onChange, min, max, step };

  const clampStep = (v) => {
    const { min: lo, max: hi, step: st } = cb.current;
    const snapped = Math.round((v - lo) / st) * st + lo;
    return Math.max(lo, Math.min(hi, Number(snapped.toFixed(4))));
  };

  const valueAt = (x) => {
    const w = widthRef.current - THUMB;
    if (w <= 0) return value;
    const ratio = Math.max(0, Math.min(1, (x - THUMB / 2) / w));
    const { min: lo, max: hi } = cb.current;
    return clampStep(lo + ratio * (hi - lo));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          startX.current = e.nativeEvent.locationX;
          cb.current.onChange?.(valueAt(startX.current));
        },
        onPanResponderMove: (_e, g) => {
          cb.current.onChange?.(valueAt(startX.current + g.dx));
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const thumbLeft = Math.max(0, ratio * (width - THUMB));

  return (
    <View
      style={styles.hit}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(clampStep(value + step));
        if (e.nativeEvent.actionName === 'decrement') onChange(clampStep(value - step));
      }}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: thumbLeft + THUMB / 2 }]} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surface3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.ink },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.surface,
    borderWidth: 6,
    borderColor: colors.ink,
  },
});

export default Slider;
