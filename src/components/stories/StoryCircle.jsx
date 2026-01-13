import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StoryCircle = ({ story, user, onPress, size = 68, showAddButton = false, onAddPress }) => {
  const hasUnviewedStories = story?.stories?.some(s => !s.isViewed);
  const avatarUrl = user?.profile?.avatarUrl || user?.profilePhoto;

  if (showAddButton) {
    return (
      <TouchableOpacity onPress={onAddPress} style={styles.container}>
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, styles.ownStoryRing]}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatar, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}
            />
          ) : (
            <View style={[styles.defaultAvatar, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}>
              <Ionicons name="person" size={size / 2} color="#9ca3af" />
            </View>
          )}
          <View style={styles.plusIcon}>
            <Ionicons name="add" size={14} color="white" />
          </View>
        </View>
        <Text style={styles.username} numberOfLines={1}>Your Story</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: hasUnviewedStories ? 3 : 2,
            borderColor: hasUnviewedStories ? '#c026d3' : '#dbdbdb',
          },
        ]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.avatar, { width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }]}
          />
        ) : (
          <View style={[styles.defaultAvatar, { width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }]}>
            <Text style={styles.defaultText}>
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </View>
      {user?.username && (
        <Text style={styles.username} numberOfLines={1}>
          {user.username}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#c026d3',
  },
  ownStoryRing: {
    borderColor: '#dbdbdb',
  },
  avatar: {
    resizeMode: 'cover',
  },
  defaultAvatar: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultText: {
    color: '#6b7280',
    fontWeight: 'bold',
    fontSize: 20,
  },
  username: {
    marginTop: 4,
    fontSize: 11,
    color: '#262626',
    textAlign: 'center',
  },
  plusIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default StoryCircle;


