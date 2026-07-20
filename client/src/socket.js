import { io } from 'socket.io-client';

// Same host the REST API lives on (Server.js listens on this port for both).
const SOCKET_URL = 'http://localhost:5000';

let socket = null;

// Opens (or reuses) the socket connection, authenticated with the stored JWT.
export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { connectSocket, getSocket, disconnectSocket };