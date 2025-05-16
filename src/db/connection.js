import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

// Use a fallback in-memory MongoDB server if the main connection fails
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/glimse_chat';
const USE_MOCK = process.env.USE_MOCK === 'true';

// Create a simple mock for testing without MongoDB
const setupMockDB = () => {
  // Create in-memory storage
  global._mockDb = {
    users: [],
    rooms: [],
    messages: []
  };

  // Mock the mongoose model methods
  const createModelMock = (collectionName) => {
    const collection = global._mockDb[collectionName.toLowerCase()];
    
    return class MockModel {
      constructor(data) {
        this._id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this.data = { ...data, _id: this._id };
        for (const key in data) {
          this[key] = data[key];
        }
      }

      static async create(data) {
        if (Array.isArray(data)) {
          return data.map(item => new MockModel(item));
        }
        const model = new MockModel(data);
        collection.push(model.data);
        return model;
      }

      static async find(query = {}) {
        return {
          select: () => ({
            populate: () => ({
              lean: () => {
                return collection;
              }
            })
          })
        };
      }

      static async findOne(query = {}) {
        // For simplicity, just return the first item or null
        return collection.length > 0 ? collection[0] : null;
      }

      static async findById(id) {
        const found = collection.find(item => item._id === id);
        if (found) {
          return {
            select: (fields) => found,
            populate: (field, projection) => found
          };
        }
        return null;
      }

      static async deleteMany() {
        collection.length = 0;
        return { deletedCount: 0 };
      }

      async save() {
        collection.push(this.data);
        return this;
      }

      async populate() {
        return this;
      }
    };
  };

  // Mock the mongoose model function
  mongoose.model = (name) => createModelMock(name);
  
  // Mock other necessary mongoose functions
  mongoose.Schema = class MockSchema {
    constructor() {}
    virtual() {
      return { ref: () => this };
    }
    pre() {
      return this;
    }
  };
  
  mongoose.Types = {
    ObjectId: (id) => id
  };

  mongoose.connect = async () => {
    console.log('Connected to mock MongoDB');
    return true;
  };
};

export const connectDB = async () => {
  try {
    if (USE_MOCK) {
      console.log('Using mock MongoDB implementation for testing');
      setupMockDB();
      return;
    }
    
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('WARNING: Using mock implementation. Data will not be persisted.');
    setupMockDB();
  }
};
