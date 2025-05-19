import { config } from 'dotenv';
import { connectDB } from './db/connection.js';
import createApp from './app.js';
import ChatHandler from './ws/chatHandler.js';

// Load environment variables
config();

// Define ports - Use a single port for both HTTP and WebSocket
const port = process.env.PORT || 3000;

// Define a default WebSocket port
const wsPort = process.env.WS_PORT || 8081;

// Main function to start the servers
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB connected successfully');
    
    // Initialize WebSocket handler with the WebSocket port
    const chatHandler = new ChatHandler(wsPort);
    chatHandler.initialize();
    console.log(`WebSocket server is running on port ${wsPort}`);
    
    // Create and start Fastify app
    const app = await createApp();
    
    await app.listen({ port: port, host: '0.0.0.0' });
    console.log(`HTTP server running at http://localhost:${port}`);
    
    console.log('Glimse Chat Server is running!');
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();
