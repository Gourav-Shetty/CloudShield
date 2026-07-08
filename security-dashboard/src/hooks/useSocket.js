import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let sharedSocket = null;

export const useSocket = () => {
  const [socket, setSocket] = useState(sharedSocket);
  const [connected, setConnected] = useState(sharedSocket ? sharedSocket.connected : false);

  useEffect(() => {
    if (!sharedSocket) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      sharedSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
    }

    setSocket(sharedSocket);
    setConnected(sharedSocket.connected);

    const handleConnect = () => {
      console.log('Socket.IO connected successfully');
      setConnected(true);
    };

    const handleDisconnect = (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setConnected(false);
    };

    const handleConnectError = (error) => {
      console.error('Socket.IO connection error:', error.message);
      setConnected(false);
    };

    sharedSocket.on('connect', handleConnect);
    sharedSocket.on('disconnect', handleDisconnect);
    sharedSocket.on('connect_error', handleConnectError);

    // If already connected when mounting, set connection state to true
    if (sharedSocket.connected) {
      setConnected(true);
    }

    return () => {
      if (sharedSocket) {
        sharedSocket.off('connect', handleConnect);
        sharedSocket.off('disconnect', handleDisconnect);
        sharedSocket.off('connect_error', handleConnectError);
      }
    };
  }, []);

  return { socket, connected };
};
