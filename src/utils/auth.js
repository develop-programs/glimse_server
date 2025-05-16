import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_jwt_secret_key';

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      username: user.username 
    }, 
    JWT_SECRET, 
    { 
      expiresIn: '7d' 
    }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Extract token from authorization header
export const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};
