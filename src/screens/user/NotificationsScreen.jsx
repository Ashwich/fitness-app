import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markAsRead, markAllAsRead } from '../../api/services/notificationService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';

const formatTimestamp = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getNotificationText = (notification) => {
  const actorName = notification.actor?.profile?.fullName || notification.actor?.username || 'Someone';
  
  switch (notification.type) {
    case 'LIKE':
      return `${actorName} liked your post`;
    case 'COMMENT':
      // Try to get the most recent comment from this actor
      const comments = notification.post?.comments || [];
      const actorComment = comments.find(c => c.userId === notification.actorId);
      const commentText = actorComment?.content || comments[0]?.content;
      if (commentText) {
        const truncated = commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText;
        return `${actorName} commented: "${truncated}"`;
      }
      return `${actorName} commented on your post`;
    case 'FOLLOW':
      return `${actorName} started following you`;
    default:
      return 'New notification';
  }
};

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications(50, 0);
      const notificationsArray = Array.isArray(data) ? data : [];
      
      // Deduplicate notifications by ID to prevent duplicate keys
      const uniqueNotifications = notificationsArray.reduce((acc, notification) => {
        if (!acc.find(n => n.id === notification.id)) {
          acc.push(notification);
        }
        return acc;
      }, []);
      
      setNotifications(uniqueNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on type
    if (notification.postId) {
      // Navigate to post (you might need to create a PostDetailScreen)
      // For now, navigate to profile
      navigation.navigate('UserProfileScreen', { userId: notification.actorId });
    } else if (notification.type === 'FOLLOW') {
      navigation.navigate('UserProfileScreen', { userId: notification.actorId });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some((n) => !n.read) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {!notifications.some((n) => !n.read) && <View style={styles.placeholder} />}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No notifications yet</Text>
              <Text style={styles.emptyStateSubtext}>
                You'll see likes, comments, and follows here
              </Text>
            </View>
          ) : (
            // Deduplicate notifications by ID before rendering
            [...new Map(notifications.map(notification => [notification.id, notification])).values()].map((notification, index) => {
              const actor = notification.actor;
              const profilePhoto = actor?.profile?.avatarUrl;
              const fullUrl = profilePhoto && !profilePhoto.startsWith('http')
                ? `${baseURL}${profilePhoto.startsWith('/') ? profilePhoto : `/${profilePhoto}`}`
                : profilePhoto;

              return (
                <TouchableOpacity
                  key={notification.id || `notification-${index}-${notification.createdAt}`}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.unreadNotification,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  {fullUrl ? (
                    <Image source={{ uri: fullUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#6b7280" />
                    </View>
                  )}
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>
                      {getNotificationText(notification)}
                    </Text>
                    <Text style={styles.timestamp}>
                      {formatTimestamp(notification.createdAt)}
                    </Text>
                  </View>
                  {notification.post?.mediaUrl && (
                    <Image
                      source={{
                        uri: notification.post.mediaUrl.startsWith('http')
                          ? notification.post.mediaUrl
                          : `${baseURL}${notification.post.mediaUrl}`,
                      }}
                      style={styles.postThumbnail}
                    />
                  )}
                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  markAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  placeholder: {
    width: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  unreadNotification: {
    backgroundColor: '#eff6ff',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  postThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginLeft: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default NotificationsScreen;

