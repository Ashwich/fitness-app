import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFilterOverlay } from '../../utils/imageFilters';

const FILTERS = [
  { id: 'none', name: 'Original', icon: 'image-outline' },
  { id: 'vintage', name: 'Vintage', icon: 'color-palette-outline' },
  { id: 'blackwhite', name: 'B&W', icon: 'contrast-outline' },
  { id: 'warm', name: 'Warm', icon: 'sunny-outline' },
  { id: 'cool', name: 'Cool', icon: 'snow-outline' },
  { id: 'bright', name: 'Bright', icon: 'flash-outline' },
  { id: 'sepia', name: 'Sepia', icon: 'camera-outline' },
  { id: 'dramatic', name: 'Dramatic', icon: 'color-filter-outline' },
];

const FilterSelector = ({ imageUri, selectedFilter, onFilterSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filters</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterItem,
              selectedFilter === filter.id && styles.filterItemSelected,
            ]}
            onPress={() => onFilterSelect(filter.id)}
          >
            <View style={[
              styles.filterPreview,
              selectedFilter === filter.id && styles.filterPreviewSelected,
            ]}>
              {imageUri ? (
                <>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.filterImage}
                  />
                  {/* Filter Overlay Preview */}
                  {filter.id !== 'none' && (
                    <View 
                      style={[
                        styles.filterOverlayPreview,
                        { backgroundColor: getFilterOverlay(filter.id) }
                      ]} 
                    />
                  )}
                </>
              ) : (
                <View style={styles.filterPlaceholder}>
                  <Ionicons name={filter.icon} size={24} color="#999" />
                </View>
              )}
              {selectedFilter === filter.id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#E1306C" />
                </View>
              )}
            </View>
            <Text
              style={[
                styles.filterName,
                selectedFilter === filter.id && styles.filterNameSelected,
              ]}
            >
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 10,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  filterItemSelected: {
    opacity: 1,
  },
  filterPreview: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    marginBottom: 5,
    position: 'relative',
  },
  filterPreviewSelected: {
    borderColor: '#E1306C',
    borderWidth: 3,
  },
  filterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
  },
  filterOverlayPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 33,
  },
  filterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    borderRadius: 10,
  },
  filterName: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  filterNameSelected: {
    color: '#E1306C',
    fontWeight: 'bold',
  },
});

export default FilterSelector;

