import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  room: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room',
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  content: { 
    type: String, 
    required: true 
  },
  messageType: { 
    type: String, 
    enum: ['text', 'system'], 
    default: 'text' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Virtual for getting sender's username
MessageSchema.virtual('senderName', {
  ref: 'User',
  localField: 'sender',
  foreignField: '_id',
  justOne: true,
  options: { select: 'username' }
});

const Message = mongoose.model('Message', MessageSchema);

export default Message;
