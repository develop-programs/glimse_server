import Message from '../models/Message.js';
import Room from '../models/Room.js';
import authenticate from '../middlewares/auth.js';

export default async function(fastify, opts) {
  // Get messages from a specific room with pagination
  fastify.get('/:roomId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      const userId = request.user.id;
      
      // Pagination parameters
      const page = parseInt(request.query.page) || 1;
      const limit = parseInt(request.query.limit) || 50;
      const skip = (page - 1) * limit;
      
      // Check if room exists and user is in it
      const room = await Room.findById(roomId);
      if (!room) {
        return reply.code(404).send({ 
          success: false, 
          message: 'Room not found' 
        });
      }
      
      // Verify user is in the room
      if (!room.users.includes(userId)) {
        return reply.code(403).send({ 
          success: false, 
          message: 'You are not a member of this room' 
        });
      }
      
      // Get messages
      const messages = await Message.find({ room: roomId })
                                 .sort({ timestamp: -1 })
                                 .skip(skip)
                                 .limit(limit)
                                 .populate('sender', 'username')
                                 .lean();
      
      // Get total count for pagination info
      const total = await Message.countDocuments({ room: roomId });
      
      return reply.code(200).send({
        success: true,
        data: messages.reverse(), // Return in chronological order
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: skip + messages.length < total
        }
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error retrieving messages', 
        error: error.message 
      });
    }
  });
  
  // Post a message to a room (HTTP alternative to WebSocket)
  fastify.post('/:roomId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      const { content } = request.body;
      const userId = request.user.id;
      
      // Validate content
      if (!content || content.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Message content is required'
        });
      }
      
      // Check if room exists and user is in it
      const room = await Room.findById(roomId);
      if (!room) {
        return reply.code(404).send({ 
          success: false, 
          message: 'Room not found' 
        });
      }
      
      // Verify user is in the room
      if (!room.users.includes(userId)) {
        return reply.code(403).send({ 
          success: false, 
          message: 'You are not a member of this room' 
        });
      }
      
      // Create new message
      const message = new Message({
        room: roomId,
        sender: userId,
        content,
        timestamp: Date.now()
      });
      
      await message.save();
      
      // Populate sender information
      await message.populate('sender', 'username');
      
      return reply.code(201).send({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error sending message', 
        error: error.message 
      });
    }
  });
  
  // Delete a message
  fastify.delete('/:messageId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { messageId } = request.params;
      const userId = request.user.id;
      
      // Find the message
      const message = await Message.findById(messageId);
      if (!message) {
        return reply.code(404).send({ 
          success: false, 
          message: 'Message not found' 
        });
      }
      
      // Check if user is the sender of the message
      if (message.sender.toString() !== userId) {
        return reply.code(403).send({ 
          success: false, 
          message: 'You can only delete your own messages' 
        });
      }
      
      // Delete the message
      await Message.findByIdAndDelete(messageId);
      
      return reply.code(200).send({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error deleting message', 
        error: error.message 
      });
    }
  });
}
