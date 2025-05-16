import User from '../models/User.js';
import Room from '../models/Room.js';
import authenticate from '../middlewares/auth.js';

export default async function(fastify, opts) {
  // Get current user profile
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = await User.findById(request.user.id)
                          .select('-password');
      
      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found'
        });
      }
      
      return reply.code(200).send({
        success: true,
        data: user
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error fetching user profile',
        error: error.message
      });
    }
  });
  
  // Update user profile
  fastify.put('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const updates = {};
      const allowedUpdates = ['username', 'email'];
      
      // Filter allowed updates
      Object.keys(request.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = request.body[key];
        }
      });
      
      // Validate updates
      if (updates.username && updates.username.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Username cannot be empty'
        });
      }
      
      if (updates.email && updates.email.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Email cannot be empty'
        });
      }
      
      // Check if username or email already exists
      if (updates.username || updates.email) {
        const query = [];
        
        if (updates.username) {
          query.push({ username: updates.username });
        }
        
        if (updates.email) {
          query.push({ email: updates.email });
        }
        
        const existingUser = await User.findOne({
          $or: query,
          _id: { $ne: request.user.id }
        });
        
        if (existingUser) {
          return reply.code(400).send({
            success: false,
            message: 'Username or email already in use'
          });
        }
      }
      
      // Update user
      const user = await User.findByIdAndUpdate(
        request.user.id,
        updates,
        { new: true }
      ).select('-password');
      
      return reply.code(200).send({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error updating profile',
        error: error.message
      });
    }
  });
  
  // Change password
  fastify.put('/me/password', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { currentPassword, newPassword } = request.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return reply.code(400).send({
          success: false,
          message: 'Current password and new password are required'
        });
      }
      
      if (newPassword.length < 6) {
        return reply.code(400).send({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
      
      // Get user with password
      const user = await User.findById(request.user.id);
      
      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        return reply.code(401).send({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      return reply.code(200).send({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error updating password',
        error: error.message
      });
    }
  });
  
  // Get user's rooms
  fastify.get('/me/rooms', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user.id;
      
      const rooms = await Room.find({ users: userId, isActive: true })
                           .select('name description creator users createdAt')
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
        message: 'Error fetching user rooms',
        error: error.message
      });
    }
  });
  
  // Get public user profile by ID
  fastify.get('/:userId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { userId } = request.params;
      
      const user = await User.findById(userId)
                          .select('username createdAt isActive');
      
      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found'
        });
      }
      
      return reply.code(200).send({
        success: true,
        data: user
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error fetching user profile',
        error: error.message
      });
    }
  });
}
