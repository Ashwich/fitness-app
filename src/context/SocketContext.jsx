import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect when user is authenticated
      socketService.connect();
      
      // Listen for connection status
      const unsubscribeConnect = socketService.on('connect', () => {
        setIsConnected(true);
      });

      const unsubscribeDisconnect = socketService.on('disconnect', () => {
        setIsConnected(false);
      });

      return () => {
        unsubscribeConnect();
        unsubscribeDisconnect();
        // Don't disconnect here - let it stay connected while app is open
        // socketService.disconnect();
      };
    } else {
      // Disconnect when user logs out
      socketService.disconnect();
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ isConnected, socketService }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

