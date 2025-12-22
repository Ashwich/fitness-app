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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  getConversation,
  sendMessage,
  markConversationAsRead,
} from '../../api/services/messageService';
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

const ChatScreen = ({ navigation, route }) => {
  const { userId, partner } = route.params;
  const { user } = useAuth();
  const { socketService } = useSocket();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef(null);

  const loadMessages = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const data = await getConversation(userId, 100, 0);
      const newMessages = Array.isArray(data) ? data : [];
      
      // Deduplicate messages by ID to prevent duplicate keys
      const uniqueMessages = newMessages.reduce((acc, message) => {
        if (!acc.find(m => m.id === message.id)) {
          acc.push(message);
        }
        return acc;
      }, []);
      
      // Sort by createdAt to maintain order
      uniqueMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      setMessages(uniqueMessages);
      
      // Mark conversation as read if there are messages
      if (newMessages && newMessages.length > 0) {
        try {
          await markConversationAsRead(userId);
        } catch (error) {
          console.warn('Error marking conversation as read:', error);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // If conversation doesn't exist yet, that's okay - just show empty
      if (error.response?.status !== 404 && showLoading) {
        Alert.alert('Error', getReadableError(error));
      }
      if (showLoading) {
        setMessages([]);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    loadMessages(true);
  }, [loadMessages]);

  useFocusEffect(
    useCallback(() => {
      loadMessages(true);
      
      // Set up Socket.io listeners for real-time messages
      console.log('[ChatScreen] Setting up socket listeners for conversation with:', userId);
      
      const unsubscribeNewMessage = socketService.on('new-message', (message) => {
        console.log('[ChatScreen] Received new-message event:', message);
        // Only add message if it's for this conversation
        // Check if message is between current user and the partner (userId)
        const isForThisConversation = 
          (message.senderId === userId && message.receiverId === user?.id) ||
          (message.senderId === user?.id && message.receiverId === userId);
        
        if (isForThisConversation) {
          console.log('[ChatScreen] Message is for this conversation, adding to list');
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some(m => m.id === message.id);
            if (exists) {
              console.log('[ChatScreen] Message already exists, skipping');
              return prev;
            }
            console.log('[ChatScreen] Adding new message to list');
            // Add message and sort by createdAt to maintain order
            const updated = [...prev, message];
            updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            return updated;
          });
          
          // Mark as read if we're viewing this conversation
          markConversationAsRead(userId).catch(err => 
            console.warn('Error marking conversation as read:', err)
          );
        } else {
          console.log('[ChatScreen] Message is not for this conversation, ignoring');
        }
      });

      const unsubscribeMessageSent = socketService.on('message-sent', (message) => {
        console.log('[ChatScreen] Received message-sent event:', message);
        // Add our own sent message to the list if it's for this conversation
        if (message.receiverId === userId && message.senderId === user?.id) {
          console.log('[ChatScreen] Message sent confirmation is for this conversation');
          setMessages((prev) => {
            const exists = prev.some(m => m.id === message.id);
            if (exists) {
              // Update existing message (replace temp message)
              const updated = prev.map(m => m.id === message.id ? message : m);
              // Sort to maintain order
              updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              return updated;
            }
            // Add message and sort by createdAt to maintain order
            const updated = [...prev, message];
            updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            return updated;
          });
        }
      });
      
      return () => {
        unsubscribeNewMessage();
        unsubscribeMessageSent();
      };
    }, [loadMessages, userId, socketService])
  );

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending) return;

    let tempMessageId = null;
    try {
      setSending(true);
      // Optimistically add message (will be confirmed via socket event)
      tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      const tempMessage = {
        id: tempMessageId,
        senderId: user.id,
        receiverId: userId,
        content: text,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setMessages((prev) => {
        // Check for duplicates before adding
        const exists = prev.some(m => m.id === tempMessageId);
        if (exists) return prev;
        const updated = [...prev, tempMessage];
        updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return updated;
      });
      setMessageText('');
      
      // Send message to server (socket will emit 'message-sent' event)
      const newMessage = await sendMessage(userId, text);
      
      // Replace temp message with real message, ensuring no duplicates
      setMessages((prev) => {
        const hasTemp = prev.some(m => m.id === tempMessageId);
        const hasReal = prev.some(m => m.id === newMessage.id);
        
        if (hasTemp && !hasReal) {
          // Replace temp with real
          const updated = prev.map(m => m.id === tempMessageId ? newMessage : m);
          updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          return updated;
        } else if (!hasTemp && !hasReal) {
          // Add real message if neither exists
          const updated = [...prev, newMessage];
          updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          return updated;
        }
        // If real message already exists, just remove temp
        return prev.filter(m => m.id !== tempMessageId);
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      if (tempMessageId) {
        setMessages((prev) => prev.filter(m => m.id !== tempMessageId));
        setMessageText(text); // Restore message text
      }
      Alert.alert('Error', getReadableError(error));
    } finally {
      setSending(false);
    }
  };

  const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
  const profilePhoto = partner?.profile?.avatarUrl;
  const fullUrl = profilePhoto && !profilePhoto.startsWith('http')
    ? `${baseURL}${profilePhoto.startsWith('/') ? profilePhoto : `/${profilePhoto}`}`
    : profilePhoto;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        {fullUrl ? (
          <Image source={{ uri: fullUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Ionicons name="person" size={20} color="#6b7280" />
          </View>
        )}
        <Text style={styles.headerTitle}>
          {partner?.profile?.fullName || partner?.username || 'User'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No messages yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start the conversation!
                </Text>
              </View>
            ) : (
              messages.map((message, index) => {
                const isFromMe = message.senderId === user?.id;
                return (
                  <View
                    key={message.id || `message-${index}-${message.createdAt}`}
                    style={[
                      styles.messageBubble,
                      isFromMe ? styles.myMessage : styles.theirMessage,
                    ]}
                  >
                    <Text style={[styles.messageText, isFromMe && styles.myMessageText]}>
                      {message.content}
                    </Text>
                    <Text style={[styles.messageTime, isFromMe && styles.myMessageTime]}>
                      {formatTimestamp(message.createdAt)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 12,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  placeholder: {
    width: 24,
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#6b7280',
    alignSelf: 'flex-end',
  },
  myMessageText: {
    color: '#ffffff',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});

export default ChatScreen;

