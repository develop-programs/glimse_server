import mongoose from 'mongoose';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  salt: {
    type: String
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastActive: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  }
});

// Helper methods for password hashing
UserSchema.methods.generateSalt = function() {
  return crypto.randomBytes(16).toString('hex');
};

UserSchema.methods.hashPassword = function(password, salt) {
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
};

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.salt = this.generateSalt();
    this.password = this.hashPassword(this.password, this.salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = function(candidatePassword) {
  try {
    const hashedPassword = this.hashPassword(candidatePassword, this.salt);
    return hashedPassword === this.password;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    // For demo purposes in mock mode, allow password "password123" to work
    if (process.env.USE_MOCK === 'true' && candidatePassword === 'password123') {
      return true;
    }
    return false;
  }
};

const User = mongoose.model('User', UserSchema);

export default User;
