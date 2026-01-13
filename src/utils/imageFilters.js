import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Apply filter to image using expo-image-manipulator
 * Note: expo-image-manipulator has limited filter support, so we use overlays for visual effects
 */
export const applyFilter = async (imageUri, filterType) => {
  if (filterType === 'none' || !filterType) {
    return imageUri;
  }

  try {
    // For now, we'll use overlay-based filters (visual only)
    // Real image manipulation would require more advanced libraries
    // The overlay is applied in the component for better performance
    return imageUri;
  } catch (error) {
    console.error('Error applying filter:', error);
    return imageUri;
  }
};

/**
 * Get filter style for React Native
 * Note: React Native doesn't support CSS filters directly, so we use overlays
 */
export const getFilterStyle = (filterType) => {
  // Return empty object - filters are applied via overlays
  return {};
};

/**
 * Get overlay color for filter effect
 * These overlays create visual filter effects
 */
export const getFilterOverlay = (filterType) => {
  const overlays = {
    none: 'transparent',
    vintage: 'rgba(197, 145, 125, 0.25)', // Warm brown overlay
    blackwhite: 'rgba(128, 128, 128, 0.4)', // Grayscale overlay
    warm: 'rgba(255, 200, 100, 0.2)', // Warm orange/yellow
    cool: 'rgba(100, 150, 255, 0.2)', // Cool blue
    bright: 'rgba(255, 255, 255, 0.15)', // Bright white
    sepia: 'rgba(201, 169, 97, 0.3)', // Sepia brown
    dramatic: 'rgba(0, 0, 0, 0.25)', // Dark dramatic
  };

  return overlays[filterType] || 'transparent';
};

/**
 * Get blend mode for filter (if supported)
 */
export const getFilterBlendMode = (filterType) => {
  const blendModes = {
    none: 'normal',
    vintage: 'multiply',
    blackwhite: 'saturation',
    warm: 'overlay',
    cool: 'overlay',
    bright: 'screen',
    sepia: 'multiply',
    dramatic: 'multiply',
  };

  return blendModes[filterType] || 'normal';
};

