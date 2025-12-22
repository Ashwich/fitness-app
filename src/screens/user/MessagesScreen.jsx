import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useBootstrap } from '../../context/BootstrapContext';
import { useSocket } from '../../context/SocketContext';
import { getConversations } from '../../api/services/messageService';
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

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { bootstrapData, refreshBootstrap, loading: bootstrapLoading } = useBootstrap();
  const { socketService } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async (showLoading = false, useBootstrapData = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Try to use bootstrap data first (much faster - 1 API call vs multiple)
      if (useBootstrapData && bootstrapData?.messages?.conversations) {
        console.log('[MessagesScreen] Using bootstrap data for conversations');
        const bootstrapConversations = bootstrapData.messages.conversations;
        
        // Deduplicate conversations by partnerId
        const uniqueConversations = bootstrapConversations.reduce((acc, conversation) => {
          if (!acc.find(c => c.partnerId === conversation.partnerId)) {
            acc.push(conversation);
          }
          return acc;
        }, []);
        
        setConversations(uniqueConversations);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Fallback to individual API call if bootstrap data not available
      console.log('[MessagesScreen] Bootstrap data not available, using individual API call');
      const data = await getConversations(50, 0);
      const newConversations = Array.isArray(data) ? data : [];
      
      // Deduplicate conversations by partnerId to prevent duplicate keys
      const uniqueConversations = newConversations.reduce((acc, conversation) => {
        if (!acc.find(c => c.partnerId === conversation.partnerId)) {
          acc.push(conversation);
        }
        return acc;
      }, []);
      
      setConversations(uniqueConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      if (showLoading) {
        Alert.alert('Error', getReadableError(error));
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [bootstrapData]);

  // Load conversations when bootstrap data is available or when component mounts
  useEffect(() => {
    // Wait for bootstrap to finish loading before making API calls
    if (bootstrapLoading) {
      // Still loading bootstrap, wait...
      return;
    }
    
    if (bootstrapData?.messages?.conversations) {
      // Use bootstrap data immediately
      console.log('[MessagesScreen] Bootstrap data ready, using it');
      loadConversations(true, true);
    } else {
      // Bootstrap finished but no data, fallback to individual API call
      console.log('[MessagesScreen] Bootstrap finished but no data, using individual API call');
      loadConversations(true, false);
    }
  }, [bootstrapData, bootstrapLoading, loadConversations]);

  useFocusEffect(
    useCallback(() => {
      // Just reload conversations from existing bootstrap data or fallback
      // Don't call refreshBootstrap here to avoid multiple API calls
      if (bootstrapData?.messages?.conversations) {
        loadConversations(true, true);
      } else if (!bootstrapLoading) {
        loadConversations(true, false);
      }
      
      // Set up Socket.io listener for conversation updates
      console.log('[MessagesScreen] Setting up socket listener for conversation updates');
      
      const unsubscribeConversationUpdate = socketService.on('conversation-updated', (conversation) => {
        console.log('[MessagesScreen] Received conversation-updated event:', conversation);
        // Update the conversation in the list
        setConversations((prev) => {
          const index = prev.findIndex(c => c.partnerId === conversation.partnerId);
          if (index >= 0) {
            console.log('[MessagesScreen] Updating existing conversation at index:', index);
            // Update existing conversation
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              lastMessage: conversation.lastMessage,
              unreadCount: conversation.unreadCount !== undefined ? conversation.unreadCount : updated[index].unreadCount,
            };
            // Move to top (most recent first)
            const [moved] = updated.splice(index, 1);
            return [moved, ...updated];
          } else {
            console.log('[MessagesScreen] New conversation, reloading all conversations');
            // New conversation - reload all to get full partner data
            loadConversations(false);
            return prev;
          }
        });
      });
      
      return () => {
        unsubscribeConversationUpdate();
      };
    }, [loadConversations, socketService])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh bootstrap data (which includes conversations)
    try {
      await refreshBootstrap();
      await loadConversations(false, true);
    } catch (error) {
      // Fallback to individual API call
      await loadConversations(false, false);
    }
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('ChatScreen', {
      userId: conversation.partnerId,
      partner: conversation.partner,
    });
  };

  const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start a conversation with someone
              </Text>
            </View>
          ) : (
            conversations.map((conversation, index) => {
              const partner = conversation.partner;
              const profilePhoto = partner?.profile?.avatarUrl;
              const fullUrl = profilePhoto && !profilePhoto.startsWith('http')
                ? `${baseURL}${profilePhoto.startsWith('/') ? profilePhoto : `/${profilePhoto}`}`
                : profilePhoto;
              const lastMessage = conversation.lastMessage;
              const isFromMe = lastMessage?.senderId === user?.id;

              return (
                <TouchableOpacity
                  key={conversation.partnerId || `conversation-${index}-${lastMessage?.createdAt || Date.now()}`}
                  style={styles.conversationItem}
                  onPress={() => handleConversationPress(conversation)}
                >
                  {fullUrl ? (
                    <Image source={{ uri: fullUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#6b7280" />
                    </View>
                  )}
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                      <Text style={styles.partnerName}>
                        {partner?.profile?.fullName || partner?.username || 'User'}
                      </Text>
                      <Text style={styles.timestamp}>
                        {lastMessage ? formatTimestamp(lastMessage.createdAt) : ''}
                      </Text>
                    </View>
                    <View style={styles.messagePreview}>
                      <Text
                        style={styles.messageText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {isFromMe ? 'You: ' : ''}
                        {lastMessage?.content || 'No messages yet'}
                      </Text>
                      {conversation.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadCount}>
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
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
  placeholder: {
    width: 24,
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
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
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

export default MessagesScreen;

