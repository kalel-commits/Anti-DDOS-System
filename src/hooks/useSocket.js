import { useContext, useCallback } from 'react';
import { SocketContext } from '../context/SocketContext';

const useSocket = () => {
  const socket = useContext(SocketContext);

  const emit = useCallback((event, data) => {
    if (!socket?.connected) {
      throw new Error('Socket is not connected');
    }
    return new Promise((resolve, reject) => {
      socket.emit(event, data, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, [socket]);

  const on = useCallback((event, callback) => {
    if (!socket?.connected) {
      throw new Error('Socket is not connected');
    }
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, [socket]);

  return {
    socket,
    connected: socket?.connected || false,
    emit,
    on,
  };
};

export default useSocket; 