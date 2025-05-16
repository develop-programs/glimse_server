# Glimse Chat Server

A real-time chat application server with WebSocket support, user authentication, and room management.

## Features

- 👤 User authentication (signup/login) using JWT
- 🔑 Secure password storage with bcrypt
- 🏠 Create and manage chat rooms
- 💬 Real-time messaging with WebSocket
- 📜 Message history and pagination
- 📱 RESTful API with Fastify
- 🗄️ MongoDB data persistence

## Prerequisites

- Node.js >= 16.x or Bun >= 1.x
- MongoDB server (local or remote)

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd glimse_server
```

2. Install dependencies
```bash
bun install
# or
npm install
```

3. Create .env file and add your configuration
```
PORT=3000
WS_PORT=3001
MONGODB_URI=mongodb://localhost:27017/glimse_chat
JWT_SECRET=your_secure_jwt_secret_key
```

## Running the server

Development mode:
```bash
bun dev
# or
npm run dev
```

Production mode:
```bash
bun start
# or
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register`: Register a new user
  - Body: `{ username, email, password }`
  
- `POST /api/auth/login`: Login user
  - Body: `{ username, password }`

### Rooms

- `GET /api/rooms`: Get all active rooms
- `POST /api/rooms`: Create a new room
  - Body: `{ name, description }`
  
- `GET /api/rooms/:roomId`: Get room by ID
- `GET /api/rooms/:roomId/messages`: Get messages from a room
- `POST /api/rooms/:roomId/join`: Join a room
- `POST /api/rooms/:roomId/leave`: Leave a room

### Messages

- `GET /api/messages/:roomId`: Get messages from a room (with pagination)
  - Query: `page, limit`
  
- `POST /api/messages/:roomId`: Send a message to a room
  - Body: `{ content }`
  
- `DELETE /api/messages/:messageId`: Delete a message

### Users

- `GET /api/users/me`: Get current user profile
- `PUT /api/users/me`: Update user profile
  - Body: `{ username, email }`
  
- `PUT /api/users/me/password`: Change password
  - Body: `{ currentPassword, newPassword }`
  
- `GET /api/users/me/rooms`: Get rooms joined by current user
- `GET /api/users/:userId`: Get public user profile

## WebSocket API

Connect to WebSocket server at `ws://localhost:3001`

### Authentication

Send after connecting:
```json
{ "type": "authenticate", "token": "YOUR_JWT_TOKEN" }
```

### Events

- Join a room:
```json
{ "type": "join_room", "roomId": "ROOM_ID" }
```

- Leave a room:
```json
{ "type": "leave_room", "roomId": "ROOM_ID" }
```

- Send a message:
```json
{ "type": "chat_message", "roomId": "ROOM_ID", "content": "Your message" }
```

- Get room users:
```json
{ "type": "get_room_users", "roomId": "ROOM_ID" }
```

- Typing status:
```json
{ "type": "typing_status", "roomId": "ROOM_ID", "isTyping": true }
```

### Receiving Events

- Room joined:
```json
{ 
  "type": "room_joined", 
  "roomId": "ROOM_ID",
  "name": "Room Name",
  "messages": [...],
  "users": [...]
}
```

- New message:
```json
{
  "type": "new_message",
  "roomId": "ROOM_ID",
  "message": {
    "id": "MESSAGE_ID",
    "content": "Message content",
    "sender": "USER_ID",
    "senderName": "Username",
    "timestamp": 1621234567890
  }
}
```

## License

MIT
