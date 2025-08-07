import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const initSocket = () => {
  socket = io('http://localhost:3001'); // Replace with your server URL

  socket.on('connect', () => {
    console.log('Connected to collaboration server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from collaboration server');
  });

  return socket;
};

export const joinSession = (sessionId: string) => {
  if (socket) {
    socket.emit('joinSession', sessionId);
  }
};

export const leaveSession = (sessionId: string) => {
  if (socket) {
    socket.emit('leaveSession', sessionId);
  }
};

export const sendEditingAction = (
  sessionId: string,
  action: any
) => {
  if (socket) {
    socket.emit('editingAction', { sessionId, action });
  }
};

export const onEditingAction = (
  callback: (action: any) => void
) => {
  if (socket) {
    socket.on('editingAction', callback);
  }
};
