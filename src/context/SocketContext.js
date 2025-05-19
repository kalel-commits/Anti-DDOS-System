import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// AWS-specific configuration
const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  transports: ['websocket', 'polling'],
  path: '/socket.io',
  query: {
    clientType: 'web'
  }
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);

  // Function to handle reconnection
  const handleReconnect = useCallback((attemptNumber) => {
    console.log(`Reconnection attempt ${attemptNumber}`);
    setReconnectAttempts(attemptNumber);
  }, []);

  // Function to handle reconnection error
  const handleReconnectError = useCallback((error) => {
    console.error('Reconnection error:', error);
    setLastError(error);
  }, []);

  // Function to handle reconnection failed
  const handleReconnectFailed = useCallback(() => {
    console.error('Failed to reconnect after all attempts');
    setError('Failed to reconnect to server');
  }, []);

  useEffect(() => {
    // Get the server URL from environment or use default
    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    console.log('Connecting to socket server:', serverUrl);

    // Initialize socket connection with AWS-specific config
    const socketInstance = io(serverUrl, SOCKET_CONFIG);

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      setLastError(null);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(err.message);
      setIsConnected(false);
      setLastError(err);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      // Handle specific disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('error', (err) => {
      console.error('Socket error:', err);
      setError(err.message);
      setLastError(err);
    });

    // Reconnection event handlers
    socketInstance.on('reconnect', handleReconnect);
    socketInstance.on('reconnect_error', handleReconnectError);
    socketInstance.on('reconnect_failed', handleReconnectFailed);

    // Set up event listeners for your specific events
    socketInstance.on('ip_blocked', (data) => {
      console.log('IP blocked:', data);
    });

    socketInstance.on('ip_unblocked', (data) => {
      console.log('IP unblocked:', data);
    });

    socketInstance.on('new_attack', (data) => {
      console.log('New attack detected:', data);
    });

    socketInstance.on('blocked_ips_update', (data) => {
      console.log('Blocked IPs updated:', data);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [handleReconnect, handleReconnectError, handleReconnectFailed]);

  const value = {
    socket,
    isConnected,
    error,
    reconnectAttempts,
    lastError,
    // Enhanced socket methods with error handling
    emit: (event, data) => {
      if (socket && isConnected) {
        try {
          socket.emit(event, data);
          return true;
        } catch (err) {
          console.error(`Error emitting event ${event}:`, err);
          setError(err.message);
          return false;
        }
      }
      return false;
    },
    on: (event, callback) => {
      if (socket) {
        try {
          socket.on(event, callback);
          return true;
        } catch (err) {
          console.error(`Error setting up listener for ${event}:`, err);
          setError(err.message);
          return false;
        }
      }
      return false;
    },
    off: (event, callback) => {
      if (socket) {
        try {
          socket.off(event, callback);
          return true;
        } catch (err) {
          console.error(`Error removing listener for ${event}:`, err);
          setError(err.message);
          return false;
        }
      }
      return false;
    },
    // Method to manually reconnect
    reconnect: () => {
      if (socket) {
        socket.connect();
      }
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 