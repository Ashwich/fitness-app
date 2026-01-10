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
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useBootstrap } from '../../context/BootstrapContext';
import { useSocket } from '../../context/SocketContext';
import { getConversations } from '../../api/services/messageService';
import { getUserRooms, getChatMessages } from '../../api/services/userCommunityChatService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';
import communityChatSocketService from '../../services/communityChatSocketService';

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { bootstrapData, refreshBootstrap, loading: bootstrapLoading } = useBootstrap();
  const { socketService } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Format timestamp helper
  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  // Load conversations (both regular and community chats)
  const loadConversations = useCallback(async (showLoading = true, useBootstrap = false) => {
    try {
      if (showLoading) setLoading(true);
      
      let conversationsData = [];
      
      // Load regular conversations
      if (useBootstrap && bootstrapData?.messages?.conversations) {
        conversationsData = bootstrapData.messages.conversations;
      } else {
        conversationsData = await getConversations(50, 0);
      }
      
      // Ensure conversations is an array
      if (!Array.isArray(conversationsData)) {
        conversationsData = [];
      }
      
      // Load community chat rooms
      try {
        const communityRooms = await getUserRooms();
        if (Array.isArray(communityRooms) && communityRooms.length > 0) {
          // Transform community rooms into conversation-like objects
          const communityConversations = await Promise.all(
            communityRooms.map(async (room) => {
              try {
                // Get last message for the room
                const messagesData = await getChatMessages(room.id || room._id, { limit: 1, offset: 0 });
                const lastMessage = messagesData?.messages?.[0] || null;
                
                return {
                  id: `community-${room.id || room._id}`,
                  partnerId: room.id || room._id,
                  type: 'community',
                  partner: {
                    username: room.name || 'Community Chat',
                    profile: {
                      fullName: room.name || 'Community Chat',
                      avatarUrl: room.avatarUrl || null,
                    },
                  },
                  room: room,
                  lastMessage: lastMessage ? {
                    content: lastMessage.content || lastMessage.message,
                    senderId: lastMessage.senderId || lastMessage.userId,
                    createdAt: lastMessage.createdAt || lastMessage.created_at,
                  } : null,
                  unreadCount: 0, // TODO: Implement unread count for community chats
                };
              } catch (error) {
                console.error(`Error loading messages for room ${room.id}:`, error);
                return {
                  id: `community-${room.id || room._id}`,
                  partnerId: room.id || room._id,
                  type: 'community',
                  partner: {
                    username: room.name || 'Community Chat',
                    profile: {
                      fullName: room.name || 'Community Chat',
                      avatarUrl: room.avatarUrl || null,
                    },
                  },
                  room: room,
                  lastMessage: null,
                  unreadCount: 0,
                };
              }
            })
          );
          
          // Combine regular conversations with community chats
          conversationsData = [...conversationsData, ...communityConversations];
        }
      } catch (error) {
        console.error('Error loading community rooms:', error);
        // Don't fail the whole load if community rooms fail
      }
      
      // Sort by last message time (most recent first)
      conversationsData.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', getReadableError(error));
      setConversations([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [bootstrapData]);

  // Refresh conversations
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBootstrap();
      await loadConversations(false, true);
    } catch (error) {
      await loadConversations(false, false);
    } finally {
      setRefreshing(false);
    }
  }, [loadConversations, refreshBootstrap]);

  // Handle conversation press
  const handleConversationPress = (conversation) => {
    if (conversation.type === 'community') {
      // Navigate to community chat
      navigation.navigate('CommunityChatScreen', {
        roomId: conversation.room?.id || conversation.room?._id || conversation.partnerId,
        room: conversation.room,
      });
    } else {
      // Navigate to regular chat
      navigation.navigate('ChatScreen', {
        userId: conversation.partnerId,
        partner: conversation.partner,
      });
    }
  };

  // Load conversations on mount and when screen is focused
  useEffect(() => {
    if (bootstrapLoading) return;
    
    if (bootstrapData?.messages?.conversations) {
      setConversations(bootstrapData.messages.conversations);
      setLoading(false);
    } else {
      loadConversations(true, false);
    }
  }, [bootstrapLoading, bootstrapData, loadConversations]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadConversations(false, true);
      }
    }, [loadConversations, loading])
  );

  // Socket listeners for real-time message updates
  useEffect(() => {
    if (!socketService) return;

    const handleNewMessage = (message) => {
      setConversations((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((c) => c.partnerId === message.senderId || c.partnerId === message.receiverId);
        
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            lastMessage: message,
            unreadCount: message.receiverId === user?.id ? (updated[index].unreadCount || 0) + 1 : 0,
          };
          // Move to top
          const [moved] = updated.splice(index, 1);
          updated.unshift(moved);
        }
        
        return updated;
      });
    };

    socketService.on('message', handleNewMessage);

    return () => {
      socketService.off('message', handleNewMessage);
    };
  }, [socketService, user?.id]);

  // Listen for community chat messages
  useEffect(() => {
    // Connect to community chat socket
    communityChatSocketService.connect();

    const handleCommunityMessage = (message) => {
      setConversations((prev) => {
        const updated = [...prev];
        const roomId = message.roomId || message.room?.id;
        const index = updated.findIndex((c) => 
          c.type === 'community' && (c.room?.id === roomId || c.room?._id === roomId || c.partnerId === roomId)
        );
        
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            lastMessage: {
              content: message.content || message.message,
              senderId: message.senderId || message.userId,
              createdAt: message.createdAt || message.created_at,
            },
            unreadCount: message.senderId !== user?.id ? (updated[index].unreadCount || 0) + 1 : 0,
          };
          // Move to top
          const [moved] = updated.splice(index, 1);
          updated.unshift(moved);
        } else if (roomId) {
          // If room not in list, add it
          updated.unshift({
            id: `community-${roomId}`,
            partnerId: roomId,
            type: 'community',
            partner: {
              username: message.room?.name || 'Community Chat',
              profile: {
                fullName: message.room?.name || 'Community Chat',
              },
            },
            room: message.room || { id: roomId },
            lastMessage: {
              content: message.content || message.message,
              senderId: message.senderId || message.userId,
              createdAt: message.createdAt || message.created_at,
            },
            unreadCount: message.senderId !== user?.id ? 1 : 0,
          });
        }
        
        return updated;
      });
    };

    const unsubscribeNewMessage = communityChatSocketService.onNewMessage(handleCommunityMessage);
    const unsubscribeMessageSent = communityChatSocketService.onMessageSent(handleCommunityMessage);

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageSent();
    };
  }, [user?.id]);

  const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Feather name="edit" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput 
              placeholder="Search messages..." 
              style={styles.searchInput} 
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Active/Stories Bar (Optional Visual Flair) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeBar}>
          <TouchableOpacity style={styles.activeUserItem}>
            <View style={styles.addStory}>
              <Ionicons name="add" size={24} color="#6366f1" />
            </View>
            <Text style={styles.activeName}>You</Text>
          </TouchableOpacity>
          {conversations.filter(conv => conv.type !== 'community').slice(0, 5).map((conv, i) => (
            <TouchableOpacity key={i} style={styles.activeUserItem}>
              <View style={styles.activeAvatarWrapper}>
                <Image 
                  source={{ uri: conv.partner?.profile?.avatarUrl || 'https://via.placeholder.com/150' }} 
                  style={styles.activeAvatar} 
                />
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.activeName} numberOfLines={1}>
                {conv.partner?.username?.split(' ')[0] || conv.partner?.profile?.fullName?.split(' ')[0] || 'User'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>Recent Messages</Text>
        </View>

        {loading && conversations.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
        ) : conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="message-square" size={32} color="#6366f1" />
            </View>
            <Text style={styles.emptyStateText}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtext}>When you message someone, they'll appear here.</Text>
          </View>
        ) : (
          conversations.map((conversation, index) => {
            const partner = conversation.partner;
            const lastMessage = conversation.lastMessage;
            const unread = conversation.unreadCount > 0;

            return (
              <TouchableOpacity
                key={conversation.partnerId || index}
                style={styles.chatItem}
                onPress={() => handleConversationPress(conversation)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarContainer}>
                  {conversation.type === 'community' ? (
                    <View style={[styles.chatAvatar, styles.communityAvatar]}>
                      <Ionicons name="people" size={24} color="#6366f1" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: partner?.profile?.avatarUrl || 'https://via.placeholder.com/150' }}
                      style={styles.chatAvatar}
                    />
                  )}
                  {unread && <View style={styles.unreadPing} />}
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.partnerName} numberOfLines={1}>
                      {partner?.profile?.fullName || partner?.username}
                    </Text>
                    <Text style={[styles.chatTime, unread && styles.unreadTime]}>
                      {lastMessage ? formatTimestamp(lastMessage.createdAt) : ''}
                    </Text>
                  </View>
                  
                  <View style={styles.chatFooterRow}>
                    <Text 
                      style={[styles.lastMessage, unread && styles.unreadMessageText]} 
                      numberOfLines={1}
                    >
                      {conversation.type === 'community' 
                        ? (lastMessage?.senderId === user?.id ? 'You: ' : `${lastMessage?.senderName || 'Someone'}: `)
                        : (lastMessage?.senderId === user?.id ? 'You: ' : '')
                      }
                      {lastMessage?.content || lastMessage?.message || 'Sent an attachment'}
                    </Text>
                    {unread && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  headerIcon: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 12 },

  // Search
  searchSection: { paddingHorizontal: 20, marginBottom: 15 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 12,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1e293b' },

  // Active Bar
  activeBar: { paddingLeft: 20, marginBottom: 20, flexDirection: 'row' },
  activeUserItem: { alignItems: 'center', marginRight: 20, width: 60 },
  activeAvatarWrapper: { padding: 2, borderRadius: 22, borderWidth: 2, borderColor: '#6366f1' },
  activeAvatar: { width: 44, height: 44, borderRadius: 22 },
  addStory: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  activeName: { fontSize: 11, color: '#64748b', marginTop: 6, fontWeight: '500' },
  onlineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#fff' },

  // List
  listHeader: { paddingHorizontal: 20, marginBottom: 10 },
  listHeaderText: { fontSize: 14, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },

  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarContainer: { position: 'relative' },
  chatAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9' },
  communityAvatar: { 
    backgroundColor: '#eef2ff', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  unreadPing: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#6366f1', position: 'absolute', top: 0, right: 0, borderWidth: 2, borderColor: '#fff' },
  
  chatInfo: { flex: 1, marginLeft: 15, borderBottomWidth: 1, borderBottomColor: '#f8fafc', paddingBottom: 12 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  partnerName: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  chatTime: { fontSize: 13, color: '#94a3b8' },
  unreadTime: { color: '#6366f1', fontWeight: '600' },

  chatFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#64748b', flex: 1, marginRight: 10 },
  unreadMessageText: { color: '#1e293b', fontWeight: '600' },
  
  badge: { backgroundColor: '#6366f1', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyStateText: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  emptyStateSubtext: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
});

export default MessagesScreen;