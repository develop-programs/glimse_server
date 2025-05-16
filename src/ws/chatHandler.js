import { WebSocketServer } from 'ws';
import { verifyToken } from '../utils/auth.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';

class ChatHandler {
  constructor(wsPort) {
    this.wsPort = wsPort;
    this.wss = null;
    this.activeConnections = new Map(); // userId -> ws connection
  }

  // Helper to convert string ID to ObjectId
  toObjectId(id) {
    try {
      return new mongoose.Types.ObjectId(id);
    } catch (error) {
      return null;
    }
  }

  // Initialize WebSocket server
  initialize() {
    this.wss = new WebSocketServer({ port: this.wsPort });
    
    this.wss.on('connection', (ws) => {
      let userId = null;

      ws.on('message', async (data) => {
        try {
          const message = this.parseMessage(data);
          if (!message || !message.type) return;

          // Handle authentication first
          if (message.type === 'authenticate') {
            const authResult = await this.handleAuthentication(ws, message);
            if (authResult.success) {
              userId = authResult.userId;
            }
            return;
          }

          // All other message types require authentication
          if (!userId) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Authentication required' 
            }));
            return;
          }

          // Handle various message types
          switch (message.type) {
            case 'join_room':
              await this.handleJoinRoom(userId, message);
              break;
            case 'leave_room':
              await this.handleLeaveRoom(userId, message);
              break;
            case 'chat_message':
              await this.handleChatMessage(userId, message);
              break;
            case 'get_room_users':
              await this.handleGetRoomUsers(userId, message);
              break;
            case 'typing_status':
              await this.handleTypingStatus(userId, message);
              break;
            default:
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Unknown message type' 
              }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Server error processing message' 
          }));
        }
      });

      ws.on('close', () => {
        if (userId) {
          this.handleDisconnect(userId);
        }
      });
    });

    console.log(`WebSocket server running on port ${this.wsPort}`);
  }

  // Parse JSON messages safely
  parseMessage(data) {
    try {
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  // Handle user authentication
  async handleAuthentication(ws, data) {
    const { token } = data;
    if (!token) {
      ws.send(JSON.stringify({ 
        type: 'auth_error', 
        message: 'No token provided' 
      }));
      return { success: false };
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      ws.send(JSON.stringify({ 
        type: 'auth_error', 
        message: 'Invalid token' 
      }));
      return { success: false };
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      ws.send(JSON.stringify({ 
        type: 'auth_error', 
        message: 'User not found' 
      }));
      return { success: false };
    }

    // Store user's connection
    this.activeConnections.set(user._id.toString(), ws);
    
    // Update user status
    user.isActive = true;
    user.lastActive = Date.now();
    await user.save();

    // Send success response
    ws.send(JSON.stringify({ 
      type: 'authenticated', 
      userId: user._id.toString(),
      username: user.username
    }));

    return { success: true, userId: user._id.toString() };
  }

  // Handle user joining a room
  async handleJoinRoom(userId, data) {
    const { roomId } = data;
    const userObjectId = this.toObjectId(userId);
    
    if (!userObjectId) {
      this.sendToUser(userId, 'error', { message: 'Invalid user ID' });
      return;
    }
    
    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      this.sendToUser(userId, 'error', { message: 'Room not found' });
      return;
    }
    
    // Check if user is already in room
    if (room.users.some(id => id.equals(userObjectId))) {
      // Just send room data, user is already a member
      this.sendRoom(userId, room);
      return;
    }
    
    // Add user to room
    room.users.push(userObjectId);
    await room.save();
    
    // Create system message
    const user = await User.findById(userId).select('username');
    
    const joinMessage = new Message({
      room: roomId,
      sender: userId,
      content: `${user.username} has joined the room`,
      messageType: 'system',
      timestamp: Date.now()
    });
    
    await joinMessage.save();
    
    // Send room data to user
    this.sendRoom(userId, room);
    
    // Notify other users in the room
    this.broadcastToRoom(roomId, 'user_joined', {
      userId,
      username: user.username,
      message: {
        id: joinMessage._id,
        content: joinMessage.content,
        messageType: joinMessage.messageType,
        timestamp: joinMessage.timestamp
      }
    }, userId);
  }

  // Handle user leaving a room
  async handleLeaveRoom(userId, data) {
    const { roomId } = data;
    const userObjectId = this.toObjectId(userId);
    
    if (!userObjectId) {
      this.sendToUser(userId, 'error', { message: 'Invalid user ID' });
      return;
    }
    
    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      this.sendToUser(userId, 'error', { message: 'Room not found' });
      return;
    }
    
    // Check if user is in room
    if (!room.users.some(id => id.equals(userObjectId))) {
      this.sendToUser(userId, 'error', { message: 'You are not in this room' });
      return;
    }
    
    // Get user data for notification
    const user = await User.findById(userId).select('username');
    
    // Remove user from room
    room.users = room.users.filter(id => !id.equals(userObjectId));
    
    // Create system message
    const leaveMessage = new Message({
      room: roomId,
      sender: userObjectId,
      content: `${user.username} has left the room`,
      messageType: 'system',
      timestamp: Date.now()
    });
    
    await leaveMessage.save();
    
    // If room is empty, mark as inactive
    if (room.users.length === 0 && !room.creator.equals(userId)) {
      room.isActive = false;
    }
    
    await room.save();
    
    // Notify user
    this.sendToUser(userId, 'room_left', { roomId });
    
    // Notify other users in the room
    this.broadcastToRoom(roomId, 'user_left', {
      userId,
      username: user.username,
      message: {
        id: leaveMessage._id,
        content: leaveMessage.content,
        messageType: leaveMessage.messageType,
        timestamp: leaveMessage.timestamp
      }
    });
  }

  // Handle chat message
  async handleChatMessage(userId, data) {
    const { roomId, content } = data;
    const userObjectId = this.toObjectId(userId);
    
    if (!userObjectId) {
      this.sendToUser(userId, 'error', { message: 'Invalid user ID' });
      return;
    }
    
    if (!content || content.trim() === '') {
      this.sendToUser(userId, 'error', { message: 'Message cannot be empty' });
      return;
    }
    
    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      this.sendToUser(userId, 'error', { message: 'Room not found' });
      return;
    }
    
    // Check if user is in room
    if (!room.users.some(id => id.equals(userObjectId))) {
      this.sendToUser(userId, 'error', { message: 'You are not in this room' });
      return;
    }
    
    // Get user data
    const user = await User.findById(userId).select('username');
    
    // Create message
    const message = new Message({
      room: roomId,
      sender: userObjectId,
      content,
      messageType: 'text',
      timestamp: Date.now()
    });
    
    await message.save();
    
    // Broadcast to all users in the room including the sender
    this.broadcastToRoom(roomId, 'new_message', {
      message: {
        id: message._id,
        content: message.content,
        sender: userId,
        senderName: user.username,
        messageType: message.messageType,
        timestamp: message.timestamp
      },
      roomId
    });
  }

  // Handle get room users request
  async handleGetRoomUsers(userId, data) {
    const { roomId } = data;
    
    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      this.sendToUser(userId, 'error', { message: 'Room not found' });
      return;
    }
    
    // Check if user is in room
    if (!room.users.includes(userId)) {
      this.sendToUser(userId, 'error', { message: 'You are not in this room' });
      return;
    }
    
    // Get users in the room
    const users = await User.find({
      _id: { $in: room.users }
    }).select('username isActive lastActive');
    
    this.sendToUser(userId, 'room_users', { 
      roomId, 
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        isActive: u.isActive,
        lastActive: u.lastActive
      }))
    });
  }

  // Handle typing status updates
  async handleTypingStatus(userId, data) {
    const { roomId, isTyping } = data;
    
    // Find room
    const room = await Room.findById(roomId);
    if (!room || !room.users.includes(userId)) {
      return; // Silently ignore if room not found or user not in room
    }
    
    // Get user data
    const user = await User.findById(userId).select('username');
    
    // Broadcast to other users in the room
    this.broadcastToRoom(roomId, 'typing_status', {
      userId,
      username: user.username,
      isTyping
    }, userId);
  }

  // Handle user disconnect
  async handleDisconnect(userId) {
    try {
      // Remove from active connections
      this.activeConnections.delete(userId);
      
      // Update user status
      await User.findByIdAndUpdate(userId, {
        isActive: false,
        lastActive: Date.now()
      });
      
      // Find all rooms user is in
      const userRooms = await Room.find({ users: userId });
      
      // Notify other users in each room
      for (const room of userRooms) {
        const user = await User.findById(userId).select('username');
        
        // Create system message
        const disconnectMessage = new Message({
          room: room._id,
          content: `${user.username} has disconnected`,
          messageType: 'system',
          timestamp: Date.now()
        });
        
        await disconnectMessage.save();
        
        // Broadcast to other users in the room
        this.broadcastToRoom(room._id, 'user_offline', {
          userId,
          username: user.username,
          message: {
            id: disconnectMessage._id,
            content: disconnectMessage.content,
            messageType: disconnectMessage.messageType,
            timestamp: disconnectMessage.timestamp
          }
        });
      }
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  // Send data to a specific user
  sendToUser(userId, type, data) {
    const ws = this.activeConnections.get(userId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  }

  // Broadcast to all users in a room
  broadcastToRoom(roomId, type, data, excludeUserId = null) {
    Room.findById(roomId)
      .then(room => {
        if (!room) return;
        
        room.users.forEach(userId => {
          const userIdStr = userId.toString();
          if (userIdStr !== excludeUserId) {
            this.sendToUser(userIdStr, type, data);
          }
        });
      })
      .catch(err => {
        console.error('Error broadcasting to room:', err);
      });
  }

  // Send room data to a user
  async sendRoom(userId, room) {
    try {
      // Get recent messages
      const messages = await Message.find({ room: room._id })
        .sort({ timestamp: -1 })
        .limit(50)
        .populate('sender', 'username')
        .lean();
      
      // Get users in the room
      const users = await User.find({
        _id: { $in: room.users }
      }).select('username isActive lastActive').lean();
      
      this.sendToUser(userId, 'room_joined', {
        roomId: room._id,
        name: room.name,
        description: room.description,
        messages: messages.reverse(), // Send in chronological order
        users: users.map(u => ({
          id: u._id,
          username: u.username,
          isActive: u.isActive,
          lastActive: u.lastActive
        }))
      });
    } catch (error) {
      console.error('Error sending room data:', error);
      this.sendToUser(userId, 'error', { message: 'Error retrieving room data' });
    }
  }
}

export default ChatHandler;
