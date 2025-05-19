// Chat testing script
const WebSocket = require('ws');

// Configuration
const WS_URL = 'ws://localhost:8081'; // WebSocket server URL
const ROOM_ID = 'test-room-' + Date.now(); // Generate a random room ID

console.log(`\nGlimpse Chat Test\n-----------------`);
console.log(`Connecting to WebSocket server at ${WS_URL}`);
console.log(`Using test room ID: ${ROOM_ID}\n`);

// Create two clients to simulate a chat
const createClient = (name) => {
  const ws = new WebSocket(WS_URL);
  console.log(`Creating client: ${name}`);
  
  ws.on('open', () => {
    console.log(`[${name}] Connected to WebSocket server`);
    
    // Join room message
    const joinMsg = {
      type: 'join_room',
      roomId: ROOM_ID
    };
    
    ws.send(JSON.stringify(joinMsg));
    console.log(`[${name}] Sent join_room request`);
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log(`[${name}] Received message:`, message.type);
    
    if (message.type === 'error') {
      console.error(`[${name}] Error:`, message.message);
    }
  });
  
  ws.on('error', (error) => {
    console.error(`[${name}] WebSocket error:`, error.message);
  });
  
  ws.on('close', () => {
    console.log(`[${name}] Disconnected from WebSocket server`);
  });
  
  return ws;
};

// Create two clients
const client1 = createClient('User1');
const client2 = createClient('User2');

// Send test messages after a delay
setTimeout(() => {
  if (client1.readyState === WebSocket.OPEN) {
    const chatMsg = {
      type: 'chat_message',
      roomId: ROOM_ID,
      content: 'Hello from User1!'
    };
    
    client1.send(JSON.stringify(chatMsg));
    console.log('[User1] Sent test message');
  }
  
  // Client 2 sends a message shortly after
  setTimeout(() => {
    if (client2.readyState === WebSocket.OPEN) {
      const chatMsg = {
        type: 'chat_message',
        roomId: ROOM_ID,
        content: 'Hi User1, this is User2!'
      };
      
      client2.send(JSON.stringify(chatMsg));
      console.log('[User2] Sent test message');
    }
  }, 1000);
}, 2000);

// Clean up after test
setTimeout(() => {
  console.log('\nTest completed. Cleaning up...');
  
  if (client1.readyState === WebSocket.OPEN) {
    client1.close();
  }
  
  if (client2.readyState === WebSocket.OPEN) {
    client2.close();
  }
  
  console.log('All connections closed. Test finished.');
}, 10000);
