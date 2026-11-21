import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { imgSrc, gifSrc, MEDIA_ATTRIBUTION } from '../../data/exercises';
import { colors, FONT_FAMILY } from '../../theme/opengym';

const PURPLE = colors.accent;

/**
 * Animated exercise demo (openGym-style).
 * Tap toggles GIF ↔ still. Compact for list rows; full for detail.
 */
export default function ExerciseMedia({
  exercise,
  compact = false,
  showHint = true,
  style,
}) {
  const [playing, setPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const catalog = exercise?.catalog || exercise;
  const gif = exercise?.gifUrl || gifSrc(catalog);
  const img = exercise?.imgUrl || imgSrc(catalog);

  if (!gif && !img) {
    return (
      <View style={[styles.placeholder, compact && styles.placeholderCompact, style]}>
        <Ionicons name="barbell-outline" size={compact ? 22 : 36} color={colors.accentLine} />
      </View>
    );
  }

  const uri = playing && gif && !failed ? gif : img;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setPlaying((p) => !p)}
      style={[styles.wrap, compact && styles.wrapCompact, style]}
    >
      {loading ? (
        <View style={[styles.loader, compact && styles.loaderCompact]}>
          <ActivityIndicator color={PURPLE} />
        </View>
      ) : null}
      <Image
        source={{ uri }}
        style={[styles.image, compact && styles.imageCompact]}
        resizeMode="contain"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
          setPlaying(false);
        }}
      />
      {showHint && !compact ? (
        <View style={styles.hint}>
          <Ionicons name={playing ? 'pause' : 'play'} size={12} color={colors.label} />
          <Text style={styles.hintText}>{playing ? 'Tap to pause' : 'Tap to play'}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function ExerciseThumb({ exercise, size = 56 }) {
  const catalog = exercise?.catalog || exercise;
  const uri = exercise?.imgUrl || imgSrc(catalog);
  if (!uri) {
    return (
      <View style={[styles.thumb, { width: size, height: size }]}>
        <Ionicons name="barbell-outline" size={size * 0.4} color={colors.accentLine} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[styles.thumbImg, { width: size, height: size, borderRadius: 12 }]}
      resizeMode="cover"
    />
  );
}

export function MediaAttribution({ style }) {
  return <Text style={[styles.attr, style]}>{MEDIA_ATTRIBUTION}</Text>;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: 280,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.sep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapCompact: {
    height: 120,
    borderRadius: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageCompact: {
    height: 120,
  },
  loader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  loaderCompact: {},
  hint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hintText: { color: colors.label, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: '600' },
  placeholder: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCompact: { height: 120, width: 120, borderRadius: 12 },
  thumb: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { backgroundColor: colors.surface2 },
  attr: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    color: colors.label3,
    textAlign: 'center',
    marginTop: 6,
  },
});
