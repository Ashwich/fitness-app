import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getConversation, sendMessage, markConversationAsRead } from '../../api/services/messageService';
import { getReadableError } from '../../utils/apiError';
import { ENV } from '../../config/env';

const ChatScreen = ({ navigation, route }) => {
  const { userId, partner } = route.params;
  const { user } = useAuth();
  const { socketService } = useSocket();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);

  // Load messages for the conversation
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getConversation(userId);
      
      console.log('[ChatScreen] API Response:', JSON.stringify(response, null, 2));
      
      // Handle different response structures
      let messagesArray = [];
      
      if (Array.isArray(response)) {
        // Response is directly an array of messages
        messagesArray = response;
      } else if (response && Array.isArray(response.messages)) {
        // Response has a messages property
        messagesArray = response.messages;
      } else if (response && Array.isArray(response.items)) {
        // Response has an items property
        messagesArray = response.items;
      } else if (response && response.data && Array.isArray(response.data)) {
        // Response has nested data
        messagesArray = response.data;
      }
      
      console.log('[ChatScreen] Extracted messages:', messagesArray.length);
      
      // Ensure messages are sorted by createdAt (oldest first)
      messagesArray = messagesArray.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateA - dateB;
      });
      
      setMessages(messagesArray);
      
      // Mark conversation as read
      try {
        await markConversationAsRead(userId);
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('[ChatScreen] Error loading messages:', error);
      console.error('[ChatScreen] Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      // Don't show alert for 404 (no conversation yet)
      if (error.response?.status !== 404) {
        Alert.alert('Error', getReadableError(error));
      }
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Send a message
  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const newMessage = await sendMessage(userId, text);
      
      // Add message to local state optimistically
      setMessages((prev) => {
        // Avoid duplicates
        const isDuplicate = prev.some((m) => 
          m.id === newMessage.id || 
          (m.content === newMessage.content && 
           Math.abs(new Date(m.createdAt || m.created_at) - new Date(newMessage.createdAt || newMessage.created_at)) < 1000)
        );
        
        if (isDuplicate) {
          return prev;
        }
        
        // Add and sort
        const updated = [...prev, newMessage];
        return updated.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateA - dateB;
        });
      });
      
      // Scroll to bottom after message is added
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
      
      // On Android, also scroll after keyboard appears
      if (Platform.OS === 'android') {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 400);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', getReadableError(error));
      // Restore message text on error
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Reload messages when screen is focused (to catch new messages)
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure socket messages are processed first
      const timer = setTimeout(() => {
        loadMessages();
      }, 300);
      return () => clearTimeout(timer);
    }, [loadMessages])
  );

  // Keyboard listeners for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardWillShow = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      const keyboardWillHide = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
      });

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
      };
    }
  }, []);

  // Socket listeners for real-time messages
  useEffect(() => {
    if (!socketService) return;

    const handleNewMessage = (message) => {
      // Check if message belongs to this conversation
      const isRelevantMessage = 
        (message.senderId === userId && message.receiverId === user?.id) ||
        (message.senderId === user?.id && message.receiverId === userId);
      
      if (isRelevantMessage) {
        setMessages((prev) => {
          // Avoid duplicates by checking both id and content+timestamp
          const isDuplicate = prev.some((m) => 
            m.id === message.id || 
            (m.content === message.content && 
             Math.abs(new Date(m.createdAt || m.created_at) - new Date(message.createdAt || message.created_at)) < 1000)
          );
          
          if (isDuplicate) {
            return prev;
          }
          
          // Add new message and sort by timestamp
          const updated = [...prev, message];
          return updated.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0);
            const dateB = new Date(b.createdAt || b.created_at || 0);
            return dateA - dateB;
          });
        });
        
        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socketService.on('message', handleNewMessage);

    return () => {
      socketService.off('message', handleNewMessage);
    };
  }, [socketService, userId, user?.id]);

  const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
  const profilePhoto = partner?.profile?.avatarUrl;
  const fullUrl = profilePhoto && !profilePhoto.startsWith('http')
    ? `${baseURL}${profilePhoto.startsWith('/') ? profilePhoto : `/${profilePhoto}`}`
    : profilePhoto;

  const renderMessage = (message, index) => {
    const isFromMe = message.senderId === user?.id;
    const messageDate = message.createdAt || message.created_at;
    const messageContent = message.content || message.text || '';

    return (
      <View
        key={message.id || `msg-${index}`}
        style={[
          styles.messageRow,
          isFromMe ? styles.myMessageRow : styles.theirMessageRow
        ]}
      >
        {!isFromMe && (
          <View style={styles.miniAvatarContainer}>
            {fullUrl ? (
              <Image source={{ uri: fullUrl }} style={styles.miniAvatar} />
            ) : (
              <View style={styles.miniAvatarPlaceholder}><Text style={styles.miniAvatarInitial}>{partner?.username?.charAt(0).toUpperCase()}</Text></View>
            )}
          </View>
        )}
        <View style={[
          styles.bubble,
          isFromMe ? styles.myBubble : styles.theirBubble,
        ]}>
          <Text style={[styles.messageText, isFromMe ? styles.myMessageText : styles.theirMessageText]}>
            {messageContent}
          </Text>
          {messageDate && (
            <Text style={[styles.messageTime, isFromMe ? styles.myTime : styles.theirTime]}>
              {new Date(messageDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={28} color="#1e293b" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerCenter}>
          <View>
            {fullUrl ? (
              <Image source={{ uri: fullUrl }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={18} color="#94a3b8" />
              </View>
            )}
            <View style={styles.onlineStatus} />
          </View>
          <View style={styles.headerNameContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {partner?.profile?.fullName || partner?.username || 'User'}
            </Text>
            <Text style={styles.headerSubtitle}>Active now</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Feather name="more-vertical" size={22} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: keyboardHeight + 20 }
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#6366f1" />
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={40} color="#6366f1" />
              </View>
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>Say hello to {partner?.username}!</Text>
            </View>
          ) : (
            messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </ScrollView>

        <View style={styles.inputWrapper}>
          <View style={styles.inputInner}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add" size={24} color="#64748b" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#94a3b8"
              value={messageText}
              onChangeText={setMessageText}
              multiline
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  headerNameContainer: { marginLeft: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  headerSubtitle: { fontSize: 12, color: '#22c55e', fontWeight: '500' },
  onlineStatus: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#fff' },
  iconButton: { padding: 4 },

  // Messages
  messagesContainer: { flex: 1 },
  messagesContent: { 
    paddingHorizontal: 16, 
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  
  miniAvatarContainer: { marginRight: 8, marginBottom: 4 },
  miniAvatar: { width: 28, height: 28, borderRadius: 14 },
  miniAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  miniAvatarInitial: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },

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
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#334155' },
  
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  theirTime: { color: '#94a3b8' },

  // Input
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
  attachButton: { padding: 8 },
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

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyStateText: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  emptyStateSubtext: { fontSize: 14, color: '#64748b', marginTop: 4 },
});

export default ChatScreen;