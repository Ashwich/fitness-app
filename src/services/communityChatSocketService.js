import { io } from 'socket.io-client';
import { ENV } from '../config/env';
import { getToken } from '../storage/tokenStorage';

/**
 * Community Chat Socket Service
 * Connects to gym-management-service (port 4000) for community chat
 */
class CommunityChatSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoomId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  async connect() {
    if (this.socket?.connected) {
      console.log('[CommunityChatSocket] Already connected');
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.warn('[CommunityChatSocket] No token available, cannot connect');
        return;
      }

      // Connect to GYM service (port 4000) for community chat
      const baseURL = ENV.GYM_SERVICE_URL; // Should be http://31.97.206.44:4000
      
      console.log('[CommunityChatSocket] Connecting to gym service:', baseURL);

      this.socket = io(baseURL, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('[CommunityChatSocket] Connection error:', error);
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[CommunityChatSocket] ✅ Connected to gym service');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[CommunityChatSocket] ❌ Disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[CommunityChatSocket] ❌ Connection error:', error.message);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[CommunityChatSocket] ❌ Max reconnection attempts reached');
      }
    });

    this.socket.on('connected', (data) => {
      console.log('[CommunityChatSocket] ✅ Server confirmed connection:', data);
    });

    // Community chat specific events
    this.socket.on('joined-room', (data) => {
      console.log('[CommunityChatSocket] ✅ Joined room:', data);
      this.emit('joined-room', data);
    });

    this.socket.on('new-community-message', (message) => {
      console.log('[CommunityChatSocket] 📨 New message:', message);
      this.emit('new-message', message);
    });

    this.socket.on('community-message-sent', (message) => {
      console.log('[CommunityChatSocket] ✅ Message sent:', message);
      this.emit('message-sent', message);
    });

    this.socket.on('community-typing', (data) => {
      this.emit('typing', data);
    });

    this.socket.on('community-join-request', (requestData) => {
      console.log('[CommunityChatSocket] 📬 New join request:', requestData);
      this.emit('join-request', requestData);
    });

    this.socket.on('community-join-request-update', (data) => {
      console.log('[CommunityChatSocket] 📬 Join request update:', data);
      this.emit('join-request-update', data);
    });

    this.socket.on('member-update', (data) => {
      console.log('[CommunityChatSocket] 👥 Member update:', data);
      this.emit('member-update', data);
    });
  }

  disconnect() {
    if (this.socket) {
      if (this.currentRoomId) {
        this.leaveRoom(this.currentRoomId);
      }
      console.log('[CommunityChatSocket] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoomId = null;
      this.listeners.clear();
    }
  }

  // Join a community chat room
  joinRoom(roomId) {
    if (!this.socket || !this.socket.connected) {
      console.warn('[CommunityChatSocket] Socket not connected, cannot join room');
      return;
    }

    if (this.currentRoomId === roomId) {
      return; // Already in this room
    }

    // Leave previous room if any
    if (this.currentRoomId) {
      this.leaveRoom(this.currentRoomId);
    }

    console.log(`[CommunityChatSocket] 🚪 Joining room: ${roomId}`);
    this.socket.emit('join-community-room', { roomId });
    this.currentRoomId = roomId;
  }

  // Leave a community chat room
  leaveRoom(roomId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    console.log(`[CommunityChatSocket] 🚪 Leaving room: ${roomId}`);
    this.socket.emit('leave-community-room', { roomId });
    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    return this.on('new-message', callback);
  }

  // Listen for message sent confirmation
  onMessageSent(callback) {
    return this.on('message-sent', callback);
  }

  // Listen for join request notifications
  onJoinRequest(callback) {
    return this.on('join-request', callback);
  }

  // Listen for join request updates
  onJoinRequestUpdate(callback) {
    return this.on('join-request-update', callback);
  }

  // Listen for member updates
  onMemberUpdate(callback) {
    return this.on('member-update', callback);
  }

  // Listen for typing indicators
  onTyping(callback) {
    return this.on('typing', callback);
  }

  // Send typing indicator
  emitTyping(roomId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('community-typing', { roomId });
    }
  }

  // Stop typing indicator
  emitStopTyping(roomId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('community-stop-typing', { roomId });
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Also register with socket if connected
    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit custom events to listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[CommunityChatSocket] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Remove all listeners
  removeAllListeners(event) {
    if (this.socket) {
      if (event) {
        this.socket.removeAllListeners(event);
        this.listeners.delete(event);
      } else {
        this.socket.removeAllListeners();
        this.listeners.clear();
      }
    }
  }
}

export default new CommunityChatSocketService();

