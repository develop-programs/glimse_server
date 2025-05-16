import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

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

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
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
