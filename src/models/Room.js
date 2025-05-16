import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  creator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  description: { 
    type: String,
    default: ''
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
});

const Room = mongoose.model('Room', RoomSchema);

export default Room;
