import Room from '../models/Room.js';
import Message from '../models/Message.js';
import authenticate from '../middlewares/auth.js';

export default async function(fastify, opts) {
  // Get all rooms
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const rooms = await Room.find({ isActive: true })
                             .select('name creator description users createdAt')
                             .populate('creator', 'username')
                             .lean();
                             
      const roomsWithCount = rooms.map(room => ({
        ...room,
        userCount: room.users.length
      }));
      
      return reply.code(200).send({
        success: true,
        data: roomsWithCount
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error fetching rooms', 
        error: error.message 
      });
    }
  });
  
  // Create a new room
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { name, description } = request.body;
      const userId = request.user.id;
      
      if (!name || name.trim() === '') {
        return reply.code(400).send({ success: false, message: 'Room name is required' });
      }
      
      const room = new Room({
        name,
        description: description || '',
        creator: userId,
        users: [userId]
      });
      
      await room.save();
      
      // Create system message for room creation
      const systemMessage = new Message({
        room: room._id,
        content: `Room "${name}" was created`,
        messageType: 'system'
      });
      
      await systemMessage.save();
      
      return reply.code(201).send({
        success: true,
        message: 'Room created successfully',
        data: room
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error creating room', 
        error: error.message 
      });
    }
  });
  
  // Get specific room by ID
  fastify.get('/:roomId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      
      const room = await Room.findById(roomId)
                          .select('name creator description users createdAt')
                          .populate('creator', 'username')
                          .populate('users', 'username');
                          
      if (!room) {
        return reply.code(404).send({ success: false, message: 'Room not found' });
      }
      
      return reply.code(200).send({
        success: true,
        data: room
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error fetching room', 
        error: error.message 
      });
    }
  });
  
  // Get messages from a specific room
  fastify.get('/:roomId/messages', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      
      // Pagination
      const page = parseInt(request.query.page) || 1;
      const limit = parseInt(request.query.limit) || 50;
      const skip = (page - 1) * limit;
      
      // Check if room exists and user is in it
      const room = await Room.findById(roomId);
      
      if (!room) {
        return reply.code(404).send({ success: false, message: 'Room not found' });
      }
      
      if (!room.users.includes(request.user.id)) {
        return reply.code(403).send({ success: false, message: 'You are not a member of this room' });
      }
      
      const messages = await Message.find({ room: roomId })
                                 .sort({ timestamp: -1 })
                                 .skip(skip)
                                 .limit(limit)
                                 .populate('sender', 'username')
                                 .lean();
                                 
      return reply.code(200).send({
        success: true,
        data: messages.reverse(),  // Return in chronological order
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit
        }
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error fetching messages', 
        error: error.message 
      });
    }
  });
  
  // Join a room
  fastify.post('/:roomId/join', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      const userId = request.user.id;
      
      const room = await Room.findById(roomId);
      
      if (!room) {
        return reply.code(404).send({ success: false, message: 'Room not found' });
      }
      
      if (room.users.includes(userId)) {
        return reply.code(400).send({ success: false, message: 'You are already a member of this room' });
      }
      
      // Add user to room
      room.users.push(userId);
      await room.save();
      
      // Create system message
      const systemMessage = new Message({
        room: roomId,
        sender: userId,
        content: `User ${request.user.username} joined the room`,
        messageType: 'system'
      });
      
      await systemMessage.save();
      
      return reply.code(200).send({
        success: true,
        message: 'Joined room successfully'
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error joining room', 
        error: error.message 
      });
    }
  });
  
  // Leave a room
  fastify.post('/:roomId/leave', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      const userId = request.user.id;
      
      const room = await Room.findById(roomId);
      
      if (!room) {
        return reply.code(404).send({ success: false, message: 'Room not found' });
      }
      
      if (!room.users.includes(userId)) {
        return reply.code(400).send({ success: false, message: 'You are not a member of this room' });
      }
      
      // Remove user from room
      room.users = room.users.filter(id => id.toString() !== userId);
      
      // Create system message
      const systemMessage = new Message({
        room: roomId,
        sender: userId,
        content: `User ${request.user.username} left the room`,
        messageType: 'system'
      });
      
      await systemMessage.save();
      
      // If room is empty and not created by this user, mark as inactive
      if (room.users.length === 0) {
        room.isActive = false;
      }
      
      await room.save();
      
      return reply.code(200).send({
        success: true,
        message: 'Left room successfully'
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error leaving room', 
        error: error.message 
      });
    }
  });
}
