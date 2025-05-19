import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
config();

// Routes
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import messageRoutes from './routes/messages.js';
import userRoutes from './routes/users.js';

// Create Fastify instance
const createApp = async () => {
  const app = Fastify({
    logger: true
  });
  
  // Register plugins
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  });
  
  // Add a health check endpoint
  app.get('/api/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  
  // Register routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(roomRoutes, { prefix: '/api/rooms' });
  app.register(messageRoutes, { prefix: '/api/messages' });
  app.register(userRoutes, { prefix: '/api/users' });
  
  // Root route
  app.get('/', async (request, reply) => {
    return { message: 'Glimse Chat API' };
  });
  
  return app;
};

export default createApp;
