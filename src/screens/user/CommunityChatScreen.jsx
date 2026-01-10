import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { getUserRooms, getChatMessages, sendChatMessage } from '../../api/services/userCommunityChatService';
import communityChatSocketService from '../../services/communityChatSocketService';
import { getReadableError } from '../../utils/apiError';

const CommunityChatScreen = ({ navigation, route }) => {
  const { roomId: routeRoomId, room: routeRoom } = route.params || {};
  const { user } = useAuth();
  const [room, setRoom] = useState(routeRoom || null);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(routeRoomId || null);
  const scrollViewRef = useRef(null);

  // Load user's rooms
  const loadRooms = useCallback(async () => {
    try {
      const roomsData = await getUserRooms();
      const roomsArray = Array.isArray(roomsData) ? roomsData : [];
      setRooms(roomsArray);
      
      // If we have a routeRoomId, find the room
      if (currentRoomId && !room) {
        const foundRoom = roomsArray.find(r => r.id === currentRoomId);
        if (foundRoom) {
          setRoom(foundRoom);
        }
      } else if (roomsArray.length > 0 && !room && !currentRoomId) {
        // If no room selected, use the first one
        setRoom(roomsArray[0]);
        setCurrentRoomId(roomsArray[0].id);
      }
    } catch (error) {
      console.error('[CommunityChatScreen] Error loading rooms:', error);
      // Don't show alert - just log
    }
  }, [currentRoomId, room]);

  // Load messages for current room
  const loadMessages = useCallback(async (roomId = currentRoomId) => {
    if (!roomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getChatMessages(roomId, {
        limit: 100,
        offset: 0,
      });
      
      const messagesArray = Array.isArray(response.messages) ? response.messages : [];
      
      // Sort by creation date (oldest first)
      const sortedMessages = messagesArray.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateA - dateB;
      });
      
      setMessages(sortedMessages);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('[CommunityChatScreen] Error loading messages:', error);
      if (error.response?.status !== 404) {
        Alert.alert('Error', getReadableError(error));
      }
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentRoomId]);

  // Send message
  const handleSend = async () => {
    if (!messageText.trim() || sending || !currentRoomId) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const newMessage = await sendChatMessage(currentRoomId, text);
      
      // Add message to local state optimistically
      setMessages((prev) => {
        const isDuplicate = prev.some((m) => m.id === newMessage.id);
        if (isDuplicate) {
          return prev;
        }
        const updated = [...prev, newMessage];
        return updated.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateA - dateB;
        });
      });
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error) {
      console.error('[CommunityChatScreen] Error sending message:', error);
      Alert.alert('Error', getReadableError(error));
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  // Initialize
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Load messages when room changes
  useEffect(() => {
    if (currentRoomId) {
      loadMessages(currentRoomId);
    }
  }, [currentRoomId, loadMessages]);

  // Periodic refresh as fallback (every 5 seconds) - only when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!currentRoomId) return;

      const interval = setInterval(() => {
        // Silently refresh messages in background
        loadMessages(currentRoomId).catch(err => {
          console.error('[CommunityChatScreen] Error in periodic refresh:', err);
        });
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }, [currentRoomId, loadMessages])
  );

  // Connect socket and join room
  useEffect(() => {
    if (!currentRoomId) return;

    const setupSocket = async () => {
      try {
        await communityChatSocketService.connect();
        // Wait a bit for connection to establish
        setTimeout(() => {
          communityChatSocketService.joinRoom(currentRoomId);
        }, 500);
      } catch (error) {
        console.error('[CommunityChatScreen] Error setting up socket:', error);
      }
    };

    setupSocket();

    return () => {
      if (currentRoomId) {
        communityChatSocketService.leaveRoom(currentRoomId);
      }
    };
  }, [currentRoomId]);

  // Socket listeners - keep active even when screen is not focused
  useEffect(() => {
    if (!currentRoomId) return;

    // Ensure socket is connected
    communityChatSocketService.connect();

    const handleNewMessage = (message) => {
      console.log('[CommunityChatScreen] Received message via socket:', message);
      
      // Check if message belongs to current room - handle different field names
      const messageRoomId = message.roomId || message.room_id || message.room?.id || message.room?._id;
      const roomIdStr = String(currentRoomId);
      const messageRoomIdStr = String(messageRoomId);
      
      console.log('[CommunityChatScreen] Comparing room IDs:', { currentRoomId: roomIdStr, messageRoomId: messageRoomIdStr });
      
      if (messageRoomIdStr === roomIdStr) {
        console.log('[CommunityChatScreen] Message belongs to current room, adding to state');
        setMessages((prev) => {
          // Avoid duplicates by checking both id and content+timestamp
          const isDuplicate = prev.some((m) => 
            m.id === message.id || 
            (m.id && message.id && String(m.id) === String(message.id)) ||
            (m.content === (message.content || message.message) && 
             Math.abs(new Date(m.createdAt || m.created_at || 0) - new Date(message.createdAt || message.created_at || 0)) < 2000)
          );
          
          if (isDuplicate) {
            console.log('[CommunityChatScreen] Duplicate message detected, skipping');
            return prev;
          }
          
          const updated = [...prev, message];
          const sorted = updated.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0);
            const dateB = new Date(b.createdAt || b.created_at || 0);
            return dateA - dateB;
          });
          
          console.log('[CommunityChatScreen] Updated messages count:', sorted.length);
          return sorted;
        });
        
        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.log('[CommunityChatScreen] Message does not belong to current room, ignoring');
      }
    };

    const unsubscribeNewMessage = communityChatSocketService.onNewMessage(handleNewMessage);
    const unsubscribeMessageSent = communityChatSocketService.onMessageSent(handleNewMessage);

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageSent();
    };
  }, [currentRoomId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    if (currentRoomId) {
      await loadMessages(currentRoomId);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const isMyMessage = (message) => {
    const senderId = message.senderId || message.sender_id;
    return String(senderId) === String(user?.id);
  };

  const renderMessage = (message, index) => {
    const myMessage = isMyMessage(message);
    // Try to get sender name from various possible fields
    let senderName = 'Unknown';
    if (message.senderName) {
      senderName = message.senderName;
    } else if (message.sender_name) {
      senderName = message.sender_name;
    } else if (message.sender?.username) {
      senderName = message.sender.username;
    } else if (message.sender?.profile?.fullName) {
      senderName = message.sender.profile.fullName;
    } else if (message.sender?.profile?.username) {
      senderName = message.sender.profile.username;
    } else if (message.user?.username) {
      senderName = message.user.username;
    } else if (message.user?.profile?.fullName) {
      senderName = message.user.profile.fullName;
    } else if (message.senderType === 'admin') {
      senderName = 'Admin';
    } else if (message.senderType) {
      senderName = message.senderType;
    }
    
    const messageContent = message.message || message.content || '';
    const createdAt = message.createdAt || message.created_at;

    return (
      <View
        key={message.id || `msg-${index}`}
        style={[
          styles.messageRow,
          myMessage ? styles.myMessageRow : styles.theirMessageRow,
        ]}
      >
        <View style={[
          styles.bubble,
          myMessage ? styles.myBubble : styles.theirBubble,
        ]}>
          {!myMessage && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          <Text style={[
            styles.messageText,
            myMessage ? styles.myMessageText : styles.theirMessageText,
          ]}>
            {messageContent}
          </Text>
          {createdAt && (
            <Text style={[
              styles.messageTime,
              myMessage ? styles.myTime : styles.theirTime,
            ]}>
              {formatTime(createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (rooms.length === 0 && !room) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community Chat</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No community groups yet</Text>
          <Text style={styles.emptyStateSubtext}>
            You'll see community groups here once you join one
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {room?.name || 'Community Chat'}
          </Text>
          {room?.gym?.name && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {room.gym.name}
            </Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onContentSizeChange={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          keyboardShouldPersistTaps="handled"
        >
          {loading && messages.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#6366f1" />
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={40} color="#6366f1" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start the conversation by sending a message
              </Text>
            </View>
          ) : (
            messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </ScrollView>

        {currentRoomId && (
          <View style={styles.inputWrapper}>
            <View style={styles.inputInner}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#94a3b8"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!messageText.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="arrow-up" size={22} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  placeholder: { width: 24 },

  messagesContainer: { flex: 1 },
  messagesContent: { 
    paddingHorizontal: 16, 
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageRow: { 
    flexDirection: 'row', 
    marginBottom: 16, 
    alignItems: 'flex-end' 
  },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#334155' },
  
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  theirTime: { color: '#94a3b8' },

  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    paddingHorizontal: 12,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#cbd5e1' },

  emptyState: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 100 
  },
  emptyStateText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1e293b',
    marginTop: 16,
  },
  emptyStateSubtext: { 
    fontSize: 14, 
    color: '#64748b', 
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default CommunityChatScreen;

