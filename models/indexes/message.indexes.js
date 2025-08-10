const mongoose = require('mongoose');

const createMessageIndexes = async () => {
  try {
    // Create indexes for common query patterns
    await mongoose.model('Message').createIndexes([
      // For finding all messages for a specific user (landlord)
      { to: 1, status: 1, createdAt: -1 },
      
      // For finding all messages for a specific property
      { property: 1, createdAt: -1 },
      
      // For finding unread messages
      { to: 1, status: 'unread' },
      
      // For finding messages by sender email
      { 'from.email': 1, createdAt: -1 },
      
      // For finding messages by date range
      { createdAt: -1 }
    ]);
    
    console.log('Message indexes created successfully');
  } catch (error) {
    console.error('Error creating message indexes:', error);
    throw error;
  }
};

module.exports = createMessageIndexes;
