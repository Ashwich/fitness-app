import { io } from 'socket.io-client';
import { ENV } from '../config/env';
import { getToken } from '../storage/tokenStorage';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  async connect() {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.warn('[Socket] No token available, cannot connect');
        return;
      }

      // Get base URL (same as API base URL)
      const baseURL = ENV.USERS_SERVICE_URL.replace('/api/users', '');
      
      console.log('[Socket] Connecting to:', baseURL);

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
      console.error('[Socket] Connection error:', error);
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] ✅ Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] ❌ Connection error:', error.message);
      console.error('[Socket] Error details:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Socket] ❌ Max reconnection attempts reached');
      }
    });

    this.socket.on('connected', (data) => {
      console.log('[Socket] ✅ Server confirmed connection:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Subscribe to an event
  on(event, callback) {
    if (!this.socket) {
      console.warn('[Socket] ⚠️ Cannot subscribe: socket not initialized. Attempting to connect...');
      this.connect().then(() => {
        if (this.socket) {
          this.socket.on(event, callback);
        }
      });
      return () => {}; // Return no-op unsubscribe function
    }

    // If socket exists but not connected, wait for connection
    if (!this.socket.connected) {
      console.log(`[Socket] ⏳ Socket not connected yet, will subscribe to '${event}' after connection`);
      const connectHandler = () => {
        this.socket.on(event, callback);
        this.socket.off('connect', connectHandler);
      };
      this.socket.on('connect', connectHandler);
    } else {
      this.socket.on(event, callback);
    }
    
    // Track listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      this.socket?.off(event, callback);
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit an event
  emit(event, data) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot emit: socket not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  // Remove all listeners for an event
  off(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.listeners.clear();
    }
  }
}

export default new SocketService();

