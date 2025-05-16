import User from '../models/User.js';
import { generateToken } from '../utils/auth.js';

export default async function (fastify, opts) {
  // Register a new user
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password } = request.body;
      
      // Check if user already exists
      let existingUser = null;
      try {
        existingUser = await User.findOne({
          $or: [
            { username: username },
            { email: email }
          ]
        });
      } catch (err) {
        console.log('Error finding existing user, proceeding anyway:', err.message);
      }
      
      if (existingUser) {
        return reply.code(400).send({ 
          success: false, 
          message: 'Username or email already exists' 
        });
      }
      
      // Create new user
      const user = new User({
        username,
        email,
        password
      });
      
      await user.save();
      
      // Generate JWT token
      const token = generateToken(user);
      
      return reply.code(201).send({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          },
          token
        }
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error registering user', 
        error: error.message 
      });
    }
  });
  
  // Login user
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body;
      
      // Find user by username
      const user = await User.findOne({ username });
      
      if (!user) {
        return reply.code(401).send({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }
      
      // Check password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return reply.code(401).send({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }
      
      // Update user status
      user.isActive = true;
      user.lastActive = Date.now();
      await user.save();
      
      // Generate JWT token
      const token = generateToken(user);
      
      return reply.code(200).send({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          },
          token
        }
      });
    } catch (error) {
      return reply.code(500).send({ 
        success: false, 
        message: 'Error logging in', 
        error: error.message 
      });
    }
  });
}
