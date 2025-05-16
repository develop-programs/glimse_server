import { connectDB } from '../db/connection.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';

// Sample data
const users = [
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123'
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'password123'
  },
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123'
  }
];

// Function to seed the database
const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected successfully');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Room.deleteMany({});
    await Message.deleteMany({});

    // Create users
    console.log('Creating users...');
    const createdUsers = await User.create(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create rooms
    console.log('Creating rooms...');
    const rooms = [
      {
        name: 'General',
        description: 'General chat room for everyone',
        creator: createdUsers[0]._id,
        users: createdUsers.map(user => user._id),
        createdAt: new Date(),
        isActive: true
      },
      {
        name: 'Tech Talk',
        description: 'Discussing technologies and programming',
        creator: createdUsers[1]._id,
        users: [createdUsers[0]._id, createdUsers[1]._id],
        createdAt: new Date(),
        isActive: true
      }
    ];

    const createdRooms = await Room.create(rooms);
    console.log(`Created ${createdRooms.length} rooms`);

    // Create messages
    console.log('Creating messages...');
    const messages = [
      {
        room: createdRooms[0]._id,
        sender: createdUsers[0]._id,
        content: 'Welcome to the General chat room!',
        messageType: 'text',
        timestamp: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        room: createdRooms[0]._id,
        sender: createdUsers[1]._id,
        content: 'Thanks for having me here!',
        messageType: 'text',
        timestamp: new Date(Date.now() - 3000000) // 50 minutes ago
      },
      {
        room: createdRooms[1]._id,
        sender: createdUsers[1]._id,
        content: 'Who wants to talk about Node.js?',
        messageType: 'text',
        timestamp: new Date(Date.now() - 1800000) // 30 minutes ago
      },
      {
        room: createdRooms[1]._id,
        sender: createdUsers[0]._id,
        content: 'I love working with Node and WebSockets!',
        messageType: 'text',
        timestamp: new Date(Date.now() - 1500000) // 25 minutes ago
      }
    ];

    const createdMessages = await Message.create(messages);
    console.log(`Created ${createdMessages.length} messages`);

    console.log('Database seeded successfully!');
    console.log('\nSample Login Credentials:');
    console.log('----------------------------');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('----------------------------');
    
    // Close the connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Execute the seed function
seedDatabase();
